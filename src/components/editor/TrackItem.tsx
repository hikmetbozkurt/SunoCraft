import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { formatDuration, formatFileSize } from '../../utils/fileHelpers';
import { WaveformEditor } from './WaveformEditor';
import type { AudioTrack } from '../../types';

interface TrackItemProps {
  track: AudioTrack;
  index: number;
}

// ─── Static Waveform Component for Inactive Tracks ──────────────────
function StaticTrackWaveform({ track }: { track: AudioTrack }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [decoding, setDecoding] = useState(false);

  useEffect(() => {
    let active = true;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const decode = async () => {
      setDecoding(true);
      try {
        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (active) setBuffer(audioBuffer);
      } catch (err) {
        console.error("Failed to decode static waveform:", err);
      } finally {
        if (active) setDecoding(false);
      }
    };

    decode();

    return () => {
      active = false;
      ctx.close();
    };
  }, [track.file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!buffer) {
      // Straight line loading placeholder
      ctx.strokeStyle = decoding ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const channelData = buffer.getChannelData(0);
    const totalSamples = channelData.length;
    const duration = buffer.duration;

    const startPx = (track.trimStart / duration) * width;
    const endPx = (track.trimEnd / duration) * width;

    // Draw peaks on canvas
    for (let x = 0; x < width; x++) {
      const chunkStart = Math.floor((x / width) * totalSamples);
      const chunkEnd = Math.floor(((x + 1) / width) * totalSamples);

      let maxVal = 0;
      const step = Math.max(1, Math.floor((chunkEnd - chunkStart) / 50));
      for (let s = chunkStart; s < chunkEnd && s < totalSamples; s += step) {
        const val = Math.abs(channelData[s]);
        if (val > maxVal) maxVal = val;
      }

      // Highlight in track theme if within trim range
      const inTrimRange = x >= startPx && x <= endPx;
      ctx.fillStyle = inTrimRange ? track.color : 'rgba(255, 255, 255, 0.15)';

      const barHeight = Math.max(1.5, maxVal * (height - 4));
      const y = (height - barHeight) / 2;
      ctx.fillRect(x, y, 1, barHeight);
    }
  }, [buffer, decoding, track.trimStart, track.trimEnd, track.color]);

  return (
    <div className="h-8 w-full rounded bg-black/35 border border-white/[0.03] overflow-hidden">
      <canvas ref={canvasRef} width={500} height={32} className="w-full h-full" />
    </div>
  );
}

// ─── Main TrackItem Component ──────────────────────────────────────
export function TrackItem({ track, index }: TrackItemProps) {
  const { removeTrack, state, setActiveTrack, toggleMute, toggleSolo, toggleLock } = useEditor();

  const effectiveDuration = track.trimEnd - track.trimStart;
  const isTrimmed = track.trimStart > 0 || track.trimEnd < track.duration;
  const isActive = state.activeTrackId === track.id;

  return (
    <div
      onClick={() => setActiveTrack(track.id)}
      className={`
        group relative flex flex-col gap-2.5 p-3 rounded-xl transition-all duration-150 cursor-pointer border
        ${isActive
          ? 'bg-violet-500/10 border-violet-500/25 shadow-lg shadow-violet-950/10'
          : 'bg-white/[0.01] border-transparent hover:bg-white/[0.03]'
        }
      `}
    >
      {/* Top Metadata Row */}
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-500 transition-colors touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>

        {/* Color Indicator */}
        <div
          className="w-1 h-7 rounded-full flex-shrink-0"
          style={{ backgroundColor: track.color }}
        />

        {/* Order Number */}
        <div className={`
          flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center
          ${isActive ? 'bg-violet-500/30 text-violet-300' : 'bg-white/[0.04] text-zinc-500'}
        `}>
          {index + 1}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-semibold truncate ${isActive ? 'text-violet-200' : 'text-zinc-300'}`}>
            {track.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-500 font-mono">{formatDuration(effectiveDuration)}</span>
            {isTrimmed && (
              <span className="text-[9px] text-amber-400/70 bg-amber-400/10 px-1 rounded">trim</span>
            )}
            {track.muted && (
              <span className="text-[9px] text-red-400/70 bg-red-400/10 px-1 rounded">M</span>
            )}
            {track.solo && (
              <span className="text-[9px] text-amber-400/70 bg-amber-400/10 px-1 rounded">S</span>
            )}
            {track.locked && (
              <span className="text-[9px] text-blue-400/70 bg-blue-400/10 px-1 rounded">🔒</span>
            )}
          </div>
        </div>

        {/* Volume bar */}
        <div className="flex-shrink-0 w-10 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-zinc-500/50"
            style={{ width: `${track.volume * 100}%` }}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }}
            className={`w-5 h-5 flex items-center justify-center rounded text-[10px] transition-all ${
              track.muted ? 'text-red-400 bg-red-500/15' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.06]'
            }`}
            title="Mute"
          >
            M
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }}
            className={`w-5 h-5 flex items-center justify-center rounded text-[10px] transition-all ${
              track.solo ? 'text-amber-400 bg-amber-500/15' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.06]'
            }`}
            title="Solo"
          >
            S
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
            className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Waveform Editor / Static Waveform Row */}
      <div className="w-full pl-7 pr-2" onClick={(e) => e.stopPropagation()}>
        {isActive ? (
          <div className="border border-white/[0.05] rounded-lg overflow-hidden bg-black/10">
            <WaveformEditor />
          </div>
        ) : (
          <StaticTrackWaveform track={track} />
        )}
      </div>
    </div>
  );
}
