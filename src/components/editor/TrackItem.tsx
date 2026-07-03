import { useEditor } from '../../hooks/useEditor';
import { formatDuration, formatFileSize } from '../../utils/fileHelpers';
import type { AudioTrack } from '../../types';

interface TrackItemProps {
  track: AudioTrack;
  index: number;
}

export function TrackItem({ track, index }: TrackItemProps) {
  const { removeTrack, state, setActiveTrack } = useEditor();

  const effectiveDuration = track.trimEnd - track.trimStart;
  const isTrimmed = track.trimStart > 0 || track.trimEnd < track.duration;
  const isActive = state.activeTrackId === track.id;

  return (
    <div
      onClick={() => setActiveTrack(track.id)}
      className={`
        group relative border rounded-xl p-4 transition-all duration-200 cursor-pointer
        ${
          isActive
            ? 'border-violet-500 bg-violet-500/5 shadow-lg shadow-violet-500/10'
            : 'border-white/[0.06] hover:border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>

        {/* Track Number */}
        <div className={`
          flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-colors
          ${isActive ? 'bg-violet-500 text-white' : 'bg-white/5 text-zinc-400'}
        `}>
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
          <p className={`text-sm font-medium truncate ${isActive ? 'text-violet-300' : 'text-zinc-200'}`}>
            {track.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-zinc-500 font-mono">
              {formatDuration(effectiveDuration)}
            </span>
            {isTrimmed && (
              <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                trimmed
              </span>
            )}
            <span className="text-[11px] text-zinc-600">{formatFileSize(track.size)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTrack(track.id);
            }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
