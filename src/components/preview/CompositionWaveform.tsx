import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { formatDuration } from '../../utils/fileHelpers';

interface CompositionWaveformProps {
  onSeek?: (time: number) => void;
}

export function CompositionWaveform({ onSeek }: CompositionWaveformProps) {
  const { state, sortedTracks, totalDuration } = useEditor();
  const { playback } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React state for triggering UI re-renders
  const [buffers, setBuffers] = useState<Map<string, AudioBuffer>>(new Map());
  const [decoding, setDecoding] = useState<Set<string>>(new Set());

  // Refs for tracking synchronous decode progress and avoiding useEffect dependency loops
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const decodingRef = useRef<Set<string>>(new Set());

  // Synchronize refs with state when tracks are deleted
  useEffect(() => {
    let changed = false;
    for (const id of buffersRef.current.keys()) {
      if (!sortedTracks.some(t => t.id === id)) {
        buffersRef.current.delete(id);
        changed = true;
      }
    }
    if (changed) {
      setBuffers(new Map(buffersRef.current));
    }
  }, [sortedTracks]);

  // Decode files in queue without dependency loops
  useEffect(() => {
    let active = true;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const decodeNext = async () => {
      for (const track of sortedTracks) {
        if (buffersRef.current.has(track.id) || decodingRef.current.has(track.id)) {
          continue;
        }

        // Mark as decoding
        decodingRef.current.add(track.id);
        setDecoding(new Set(decodingRef.current));

        try {
          const arrayBuffer = await track.file.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          
          if (!active) return;
          
          buffersRef.current.set(track.id, audioBuffer);
          setBuffers(new Map(buffersRef.current));
        } catch (err) {
          console.error(`Error decoding audio track ${track.name}:`, err);
        } finally {
          if (active) {
            decodingRef.current.delete(track.id);
            setDecoding(new Set(decodingRef.current));
          }
        }
      }
    };

    decodeNext();

    return () => {
      active = false;
      ctx.close();
    };
  }, [sortedTracks]);

  // Redraw canvas on track, buffer, or playback time changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions dynamically scaled by device pixel ratio for retina screens
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (sortedTracks.length === 0 || totalDuration === 0) {
      // Draw flat timeline baseline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw track boundaries and waveforms
    let currentX = 0;
    const scale = width / totalDuration; // pixels per second

    sortedTracks.forEach((track) => {
      const clipDuration = track.trimEnd - track.trimStart;
      const segmentWidth = clipDuration * scale;

      const startX = Math.round(currentX);
      const nextX = currentX + segmentWidth;
      const endX = Math.round(nextX);
      const segmentPx = endX - startX;

      // Draw background segment strip
      ctx.fillStyle = track.muted ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(startX, 0, segmentPx, height);

      // Draw segment divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();

      const buffer = buffers.get(track.id);
      if (buffer) {
        // Draw real waveform peaks
        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        
        const startSample = Math.floor(track.trimStart * sampleRate);
        const endSample = Math.floor(track.trimEnd * sampleRate);
        const totalSamples = endSample - startSample;

        ctx.fillStyle = track.muted ? '#4b5563' : track.color;

        for (let i = 0; i < segmentPx; i++) {
          const pixelX = startX + i;
          
          // Map pixel offset to audio buffer sample chunks
          const chunkStart = startSample + Math.floor((i / segmentPx) * totalSamples);
          const chunkEnd = startSample + Math.floor(((i + 1) / segmentPx) * totalSamples);
          
          let maxVal = 0;
          const searchStep = Math.max(1, Math.floor((chunkEnd - chunkStart) / 60)); // Fast sampling

          for (let s = chunkStart; s < chunkEnd && s < channelData.length; s += searchStep) {
            const val = Math.abs(channelData[s]);
            if (val > maxVal) maxVal = val;
          }

          // Incorporate volume and gain scaling
          const gainLinear = Math.pow(10, track.gain / 20);
          const volumeFactor = track.volume * gainLinear;
          const finalAmplitude = Math.min(1, maxVal * volumeFactor);

          // Render symmetrical waveform peaks from center y-axis
          const barHeight = Math.max(2 * dpr, finalAmplitude * (height - 12 * dpr));
          const y = (height - barHeight) / 2;
          ctx.fillRect(pixelX, y, 1, barHeight);
        }

        // Draw track name badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = `${Math.round(8.5 * dpr)}px monospace`;
        ctx.fillText(
          track.name.replace(/\.[^/.]+$/, "").substring(0, 15), 
          startX + Math.round(6 * dpr), 
          Math.round(12 * dpr)
        );
      } else {
        // Render loading state baseline
        ctx.strokeStyle = decoding.has(track.id) ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(startX, height / 2);
        ctx.lineTo(endX, height / 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = `${Math.round(8.5 * dpr)}px system-ui`;
        ctx.fillText(
          decoding.has(track.id) ? 'Decoding…' : 'Queued…', 
          startX + Math.round(6 * dpr), 
          height / 2 - Math.round(4 * dpr)
        );
      }

      currentX = nextX;
    });

    // 2. Draw Playhead
    const playheadX = playback.currentTime * scale;
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#22d3ee'; // Cyan playhead line
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Top circular cap
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(playheadX, Math.round(3 * dpr), Math.round(3 * dpr), 0, Math.PI * 2);
      ctx.fill();
    }
  }, [sortedTracks, buffers, decoding, totalDuration, playback.currentTime]);

  // Click canvas to seek
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSeek || totalDuration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const seekTime = clickPercent * totalDuration;
    
    // Dispatch global seek event and invoke callback
    document.dispatchEvent(new CustomEvent('sunocraft:seek', { detail: seekTime }));
    if (onSeek) onSeek(seekTime);
  };

  const togglePlayPause = () => {
    document.dispatchEvent(new CustomEvent('sunocraft:playpause'));
  };

  const handleStop = () => {
    document.dispatchEvent(new CustomEvent('sunocraft:stop'));
  };

  return (
    <div className="w-full bg-zinc-950/60 border border-white/[0.04] rounded-lg p-2 flex flex-col gap-2">
      {/* Waveform Controls Header */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Composition (Final Cut)</span>
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded px-1.5 py-0.5">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              disabled={sortedTracks.length === 0}
              className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
              title="Play/Pause"
            >
              {playback.isPlaying ? (
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              ) : (
                <svg className="w-2.5 h-2.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            {/* Stop */}
            <button
              onClick={handleStop}
              disabled={sortedTracks.length === 0}
              className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
              title="Stop"
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
            </button>
          </div>
        </div>
        
        {/* Time Status */}
        <div className="text-[10px] text-zinc-500 font-mono tabular-nums">
          <span className="text-cyan-400 font-medium">{formatDuration(playback.currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative h-16 w-full rounded overflow-hidden bg-black/40 border border-white/[0.03]">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-pointer hover:bg-white/[0.01] transition-colors"
        />
      </div>
    </div>
  );
}
