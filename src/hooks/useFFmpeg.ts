import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { useEditor } from './useEditor';
import { buildAudioConcatArgs, buildMergeAudioArgs, buildVideoArgs } from '../utils/ffmpegCommands';

const CORE_VERSION = '0.12.9';
const BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { state, setRenderState, sortedTracks } = useEditor();
  const logsRef = useRef<string[]>([]);

  // ─── Load FFmpeg core ────────────────────────────────────────
  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    logsRef.current = [];
    setRenderState({ status: 'loading-ffmpeg', progress: 0, error: null, logs: [] });

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      // Progress listener
      ffmpeg.on('progress', ({ progress }) => {
        const pct = Math.round(progress * 100);
        setRenderState({ progress: Math.min(pct, 100) });
      });

      // Log listener — use ref to avoid stale closure
      ffmpeg.on('log', ({ message }) => {
        logsRef.current = [...logsRef.current, message].slice(-50);
        setRenderState({ logs: logsRef.current });
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setLoaded(true);
      setRenderState({ status: 'idle', progress: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load FFmpeg';
      setRenderState({ status: 'error', error: message });
    } finally {
      setLoading(false);
    }
  }, [loaded, loading, setRenderState]);

  // ─── Helper: cleanup temp files from virtual FS ─────────────
  const cleanupFS = useCallback(async (filenames: string[]) => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) return;
    for (const name of filenames) {
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        // file may not exist, ignore
      }
    }
  }, []);

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

    logsRef.current = [];
    setRenderState({ status: 'processing', progress: 0, error: null, outputUrl: null, logs: [] });

    const writtenFiles: string[] = [];

    // Map audio tracks to safe virtual ASCII names
    const virtualTracks = tracks.map((track, i) => {
      const lastDot = track.name.lastIndexOf('.');
      const ext = lastDot >= 0 ? track.name.substring(lastDot) : '.mp3';
      return {
        ...track,
        name: `input_audio_${i}${ext}`,
      };
    });

    const { outputFormat, backgroundMedia } = state;

    // Map background media to safe virtual ASCII name
    const bgLastDot = backgroundMedia ? backgroundMedia.name.lastIndexOf('.') : -1;
    const bgExt = bgLastDot >= 0 ? backgroundMedia!.name.substring(bgLastDot) : '.png';
    const virtualBg = backgroundMedia ? {
      ...backgroundMedia,
      name: `input_bg${bgExt}`,
    } : null;

    try {
      // Write all audio files to FFmpeg virtual filesystem with safe ASCII names
      for (let i = 0; i < tracks.length; i++) {
        const fileData = await fetchFile(tracks[i].file);
        const virtualName = virtualTracks[i].name;
        await ffmpeg.writeFile(virtualName, fileData);
        writtenFiles.push(virtualName);
      }

      if (outputFormat === '.mp4' && virtualBg) {
        // ── Video mode: merge audio first, then combine with background ──
        // Write background file with safe ASCII name
        const bgData = await fetchFile(virtualBg.file);
        await ffmpeg.writeFile(virtualBg.name, bgData);
        writtenFiles.push(virtualBg.name);

        // Step 1: Merge audio → temp_audio.wav
        const mergeArgs = buildMergeAudioArgs(virtualTracks);
        await ffmpeg.exec(mergeArgs);
        writtenFiles.push('temp_audio.wav');

        // Step 2: Background + merged audio → output.mp4
        const videoArgs = buildVideoArgs(virtualTracks, virtualBg);
        await ffmpeg.exec(videoArgs);
        writtenFiles.push('output.mp4');

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
        const args = buildAudioConcatArgs(virtualTracks, outputFormat);
        await ffmpeg.exec(args);

        const outputName = `output${outputFormat}`;
        writtenFiles.push(outputName);
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
      const message = err instanceof Error ? err.message : 'Render error occurred';
      setRenderState({ status: 'error', progress: 0, error: message });
    } finally {
      // Clean up temp files from the virtual filesystem
      await cleanupFS(writtenFiles);
    }
  }, [load, sortedTracks, state, setRenderState, cleanupFS]);

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
