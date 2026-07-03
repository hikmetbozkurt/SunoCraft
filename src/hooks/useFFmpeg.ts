import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { useEditor } from './useEditor';
import { buildAudioConcatArgs, buildMergeAudioArgs, buildVideoArgs } from '../utils/ffmpegCommands';

const CORE_VERSION = '0.12.9';
const BASE_URL = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm`;

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { state, setRenderState, sortedTracks } = useEditor();

  // ─── Load FFmpeg core ────────────────────────────────────────
  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    setRenderState({ status: 'loading-ffmpeg', progress: 0, error: null, logs: [] });

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      // Progress listener
      ffmpeg.on('progress', ({ progress }) => {
        const pct = Math.round(progress * 100);
        setRenderState({ progress: Math.min(pct, 100) });
      });

      // Log listener
      ffmpeg.on('log', ({ message }) => {
        setRenderState({
          logs: [...(state.renderState.logs || []), message].slice(-50),
        });
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });

      setLoaded(true);
      setRenderState({ status: 'idle', progress: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'FFmpeg yüklenemedi';
      setRenderState({ status: 'error', error: message });
    } finally {
      setLoading(false);
    }
  }, [loaded, loading, setRenderState, state.renderState.logs]);

  // ─── Render (process all tracks) ────────────────────────────
  const render = useCallback(async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
      // Auto-load on first render
      await load();
      return;
    }

    const tracks = sortedTracks;
    if (tracks.length === 0) return;

    setRenderState({ status: 'processing', progress: 0, error: null, outputUrl: null });

    try {
      // Write all audio files to FFmpeg virtual filesystem
      for (const track of tracks) {
        const fileData = await fetchFile(track.file);
        await ffmpeg.writeFile(track.name, fileData);
      }

      const { outputFormat, backgroundMedia } = state;

      if (outputFormat === '.mp4' && backgroundMedia) {
        // ── Video mode: merge audio first, then combine with background ──
        // Write background file
        const bgData = await fetchFile(backgroundMedia.file);
        await ffmpeg.writeFile(backgroundMedia.name, bgData);

        // Step 1: Merge audio → temp_audio.wav
        const mergeArgs = buildMergeAudioArgs(tracks);
        await ffmpeg.exec(mergeArgs);

        // Step 2: Background + merged audio → output.mp4
        const videoArgs = buildVideoArgs(tracks, backgroundMedia);
        await ffmpeg.exec(videoArgs);

        // Read output
        const data = await ffmpeg.readFile('output.mp4');
        const blob = new Blob([(data as Uint8Array).buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        setRenderState({
          status: 'completed',
          progress: 100,
          outputUrl: url,
          outputFilename: 'sunocraft_output.mp4',
        });
      } else {
        // ── Audio-only mode ──
        const args = buildAudioConcatArgs(tracks, outputFormat);
        await ffmpeg.exec(args);

        const outputName = `output${outputFormat}`;
        const data = await ffmpeg.readFile(outputName);

        const mimeMap: Record<string, string> = {
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.mp4': 'video/mp4',
        };

        const blob = new Blob([(data as Uint8Array).buffer], {
          type: mimeMap[outputFormat] || 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);

        setRenderState({
          status: 'completed',
          progress: 100,
          outputUrl: url,
          outputFilename: `sunocraft_output${outputFormat}`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Render hatası oluştu';
      setRenderState({ status: 'error', progress: 0, error: message });
    }
  }, [load, sortedTracks, state, setRenderState]);

  // ─── Download output ─────────────────────────────────────────
  const downloadOutput = useCallback(() => {
    const { outputUrl, outputFilename } = state.renderState;
    if (!outputUrl || !outputFilename) return;

    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = outputFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [state.renderState]);

  return {
    loaded,
    loading,
    load,
    render,
    downloadOutput,
  };
}
