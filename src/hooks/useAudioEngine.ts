import { useRef, useCallback, useEffect } from 'react';
import { useEditor } from './useEditor';
import type { AudioTrack } from '../types';

/**
 * Real-time audio engine using Web Audio API.
 * Plays the composition (all tracks sequentially, with volume/pan/fade) for live preview.
 * FFmpeg is NOT used here — this is for instant preview only.
 */
export function useAudioEngine() {
  const { state, sortedTracks, totalDuration, setPlayback, hasSolo } = useEditor();
  const { playback } = state;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  // ── Initialize AudioContext ───────────────────────────────────
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = playback.masterVolume;
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      masterGain.connect(analyser);
      analyserRef.current = analyser;
    }
    return audioCtxRef.current;
  }, [playback.masterVolume]);

  // ── Decode audio file to AudioBuffer ──────────────────────────
  const decodeTrack = useCallback(async (track: AudioTrack): Promise<AudioBuffer> => {
    const cached = audioBuffersRef.current.get(track.id);
    if (cached) return cached;

    const ctx = getAudioContext();
    const arrayBuffer = await track.file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    audioBuffersRef.current.set(track.id, audioBuffer);
    return audioBuffer;
  }, [getAudioContext]);

  // ── Stop all playing sources ──────────────────────────────────
  const stopAllSources = useCallback(() => {
    sourceNodesRef.current.forEach(source => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    sourceNodesRef.current = [];
    cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Time update loop ──────────────────────────────────────────
  const startTimeUpdate = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const update = () => {
      const elapsed = (ctx.currentTime - startTimeRef.current) * playback.playbackSpeed;
      const currentTime = offsetRef.current + elapsed;

      if (currentTime >= totalDuration) {
        if (playback.isLooping) {
          // Restart from beginning
          offsetRef.current = 0;
          startTimeRef.current = ctx.currentTime;
          setPlayback({ currentTime: 0 });
        } else {
          setPlayback({ isPlaying: false, currentTime: totalDuration });
          stopAllSources();
          return;
        }
      } else {
        setPlayback({ currentTime });
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
  }, [playback.playbackSpeed, playback.isLooping, totalDuration, setPlayback, stopAllSources]);

  // ── Play composition ──────────────────────────────────────────
  const play = useCallback(async () => {
    if (sortedTracks.length === 0) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    stopAllSources();

    // Update master volume
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = playback.masterVolume;
    }

    // Decode all tracks
    const buffers: { track: AudioTrack; buffer: AudioBuffer }[] = [];
    for (const track of sortedTracks) {
      try {
        const buffer = await decodeTrack(track);
        buffers.push({ track, buffer });
      } catch (err) {
        console.warn(`Failed to decode track: ${track.name}`, err);
      }
    }

    // Schedule tracks sequentially
    let scheduleTime = 0;
    const startOffset = playback.currentTime;

    for (const { track, buffer } of buffers) {
      const clipDuration = track.trimEnd - track.trimStart;
      const clipStart = scheduleTime;
      const clipEnd = scheduleTime + clipDuration;

      // Skip tracks that end before the current seek position
      if (clipEnd <= startOffset) {
        scheduleTime += clipDuration;
        continue;
      }

      // Determine if track should be audible (mute/solo logic)
      const isAudible = !track.muted && (!hasSolo || track.solo);

      // Create source
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playback.playbackSpeed;

      // Track gain node
      const trackGain = ctx.createGain();
      trackGain.gain.value = isAudible ? track.volume * Math.pow(10, track.gain / 20) : 0;

      // Pan node
      const panner = ctx.createStereoPanner();
      panner.pan.value = track.pan;

      // Connect: source → trackGain → panner → masterGain
      source.connect(trackGain);
      trackGain.connect(panner);
      panner.connect(masterGainRef.current!);

      // Apply fade in/out via gain automation
      if (isAudible && track.fadeIn > 0) {
        const fadeInStart = clipStart;
        const fadeInEnd = Math.min(clipStart + track.fadeIn, clipEnd);
        const relStart = Math.max(0, fadeInStart - startOffset);
        const relEnd = Math.max(0, fadeInEnd - startOffset);
        if (relEnd > relStart) {
          trackGain.gain.setValueAtTime(0, ctx.currentTime + relStart);
          trackGain.gain.linearRampToValueAtTime(
            track.volume * Math.pow(10, track.gain / 20),
            ctx.currentTime + relEnd
          );
        }
      }

      if (isAudible && track.fadeOut > 0) {
        const fadeOutStart = Math.max(clipEnd - track.fadeOut, clipStart);
        const relFadeStart = Math.max(0, fadeOutStart - startOffset);
        const relFadeEnd = Math.max(0, clipEnd - startOffset);
        if (relFadeEnd > relFadeStart) {
          trackGain.gain.setValueAtTime(
            track.volume * Math.pow(10, track.gain / 20),
            ctx.currentTime + relFadeStart
          );
          trackGain.gain.linearRampToValueAtTime(0, ctx.currentTime + relFadeEnd);
        }
      }

      // Calculate when to start this source
      const sourceOffset = Math.max(startOffset - clipStart, 0) + track.trimStart;
      const delayTime = Math.max(clipStart - startOffset, 0);
      const playDuration = clipDuration - Math.max(startOffset - clipStart, 0);

      if (playDuration > 0) {
        source.start(ctx.currentTime + delayTime, sourceOffset, playDuration);
        sourceNodesRef.current.push(source);
      }

      scheduleTime += clipDuration;
    }

    offsetRef.current = startOffset;
    startTimeRef.current = ctx.currentTime;
    setPlayback({ isPlaying: true });
    startTimeUpdate();
  }, [sortedTracks, playback, getAudioContext, decodeTrack, stopAllSources, setPlayback, startTimeUpdate, hasSolo]);

  // ── Pause ─────────────────────────────────────────────────────
  const pause = useCallback(() => {
    stopAllSources();
    const ctx = audioCtxRef.current;
    if (ctx) {
      const elapsed = (ctx.currentTime - startTimeRef.current) * playback.playbackSpeed;
      offsetRef.current = offsetRef.current + elapsed;
    }
    setPlayback({ isPlaying: false });
  }, [stopAllSources, setPlayback, playback.playbackSpeed]);

  // ── Stop (pause + reset to 0) ────────────────────────────────
  const stop = useCallback(() => {
    stopAllSources();
    offsetRef.current = 0;
    setPlayback({ isPlaying: false, currentTime: 0 });
  }, [stopAllSources, setPlayback]);

  // ── Seek ──────────────────────────────────────────────────────
  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(totalDuration, time));
    offsetRef.current = clampedTime;
    setPlayback({ currentTime: clampedTime });

    // If currently playing, restart playback from new position
    if (playback.isPlaying) {
      stopAllSources();
      // play() will be called by the effect watching isPlaying
      // Actually, let's just re-trigger play directly
      setTimeout(() => play(), 0);
    }
  }, [totalDuration, setPlayback, playback.isPlaying, stopAllSources, play]);

  // ── Toggle Play/Pause ─────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    if (playback.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [playback.isPlaying, play, pause]);

  // ── Set Master Volume ─────────────────────────────────────────
  const setMasterVolume = useCallback((volume: number) => {
    setPlayback({ masterVolume: volume });
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, [setPlayback]);

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAllSources();
      audioCtxRef.current?.close();
    };
  }, [stopAllSources]);

  return {
    play,
    pause,
    stop,
    seek,
    togglePlayPause,
    setMasterVolume,
    analyserRef,
    getAudioContext,
  };
}
