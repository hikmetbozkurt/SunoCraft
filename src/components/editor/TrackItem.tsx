import { useState, useCallback, type ChangeEvent } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { formatDuration, formatFileSize } from '../../utils/fileHelpers';
import type { AudioTrack } from '../../types';

interface TrackItemProps {
  track: AudioTrack;
  index: number;
}

export function TrackItem({ track, index }: TrackItemProps) {
  const { removeTrack, updateTrim } = useEditor();
  const [showTrim, setShowTrim] = useState(false);

  const effectiveDuration = track.trimEnd - track.trimStart;

  const handleTrimStartChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0 && val < track.trimEnd) {
        updateTrim(track.id, val, track.trimEnd);
      }
    },
    [track.id, track.trimEnd, updateTrim]
  );

  const handleTrimEndChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > track.trimStart && val <= track.duration) {
        updateTrim(track.id, track.trimStart, val);
      }
    },
    [track.id, track.trimStart, track.duration, updateTrim]
  );

  const resetTrim = useCallback(() => {
    updateTrim(track.id, 0, track.duration);
  }, [track.id, track.duration, updateTrim]);

  const isTrimmed = track.trimStart > 0 || track.trimEnd < track.duration;

  return (
    <div className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-xl p-4 transition-all duration-200">
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors touch-none">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>

        {/* Track Number */}
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </div>

        {/* Waveform Placeholder */}
        <div className="flex-shrink-0 w-12 h-8 rounded-md bg-gradient-to-r from-violet-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden">
          <div className="flex items-end gap-[2px] h-full py-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] bg-violet-400/60 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{track.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-zinc-500 font-mono">
              {formatDuration(effectiveDuration)}
            </span>
            {isTrimmed && (
              <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                kırpılmış
              </span>
            )}
            <span className="text-[11px] text-zinc-600">{formatFileSize(track.size)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Trim toggle */}
          <button
            onClick={() => setShowTrim(!showTrim)}
            className={`p-1.5 rounded-lg transition-all ${
              showTrim ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-white/5 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Kırp"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={() => removeTrack(track.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
            title="Sil"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Trim Controls (collapsible) */}
      {showTrim && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Başlangıç (sn)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max={track.trimEnd - 0.1}
                value={track.trimStart.toFixed(1)}
                onChange={handleTrimStartChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-200 font-mono focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                Bitiş (sn)
              </label>
              <input
                type="number"
                step="0.1"
                min={track.trimStart + 0.1}
                max={track.duration}
                value={track.trimEnd.toFixed(1)}
                onChange={handleTrimEndChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-200 font-mono focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div className="flex-shrink-0 pt-4">
              <button
                onClick={resetTrim}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Kırpmayı sıfırla"
              >
                Sıfırla
              </button>
            </div>
          </div>
          {/* Trim bar visualization */}
          <div className="mt-2 h-1.5 rounded-full bg-white/5 relative overflow-hidden">
            <div
              className="absolute h-full rounded-full bg-gradient-to-r from-violet-500/60 to-cyan-500/60"
              style={{
                left: `${(track.trimStart / track.duration) * 100}%`,
                width: `${((track.trimEnd - track.trimStart) / track.duration) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
