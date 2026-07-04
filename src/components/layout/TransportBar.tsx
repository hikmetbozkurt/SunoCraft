import { useEditor } from '../../hooks/useEditor';
import { formatDuration } from '../../utils/fileHelpers';

interface TransportBarProps {
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onSetMasterVolume: (vol: number) => void;
}

export function TransportBar({ onPlayPause, onStop, onSeek, onSetMasterVolume }: TransportBarProps) {
  const { state, totalDuration, setPlayback } = useEditor();
  const { playback } = state;

  const remaining = Math.max(0, totalDuration - playback.currentTime);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="flex items-center h-10 px-3 border-t border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl select-none gap-2">
      {/* Playback Controls */}
      <div className="flex items-center gap-1">
        {/* Stop */}
        <button
          onClick={onStop}
          title="Stop (Esc)"
          className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        {/* Play / Pause */}
        <button
          onClick={onPlayPause}
          title={playback.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          disabled={state.tracks.length === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-violet-500/20"
        >
          {playback.isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Time Display */}
      <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums min-w-[140px]">
        <span className="text-zinc-200 font-semibold">{formatDuration(playback.currentTime)}</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-400">{formatDuration(totalDuration)}</span>
        <span className="text-zinc-600 text-[10px] ml-1">-{formatDuration(remaining)}</span>
      </div>

      {/* Progress Scrubber */}
      <div className="flex-1 mx-2">
        <input
          type="range"
          min={0}
          max={totalDuration || 1}
          step={0.01}
          value={playback.currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-violet-500
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
            [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm
            [&::-webkit-slider-thumb]:hover:bg-violet-300 [&::-webkit-slider-thumb]:transition-colors"
        />
      </div>

      {/* Loop Toggle */}
      <button
        onClick={() => setPlayback({ isLooping: !playback.isLooping })}
        title={`Loop ${playback.isLooping ? 'On' : 'Off'} (L)`}
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
          playback.isLooping
            ? 'text-violet-400 bg-violet-500/15'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.06]" />

      {/* Speed */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-500 font-medium">SPEED</span>
        <select
          value={playback.playbackSpeed}
          onChange={(e) => setPlayback({ playbackSpeed: parseFloat(e.target.value) })}
          className="bg-transparent text-xs text-zinc-300 font-mono cursor-pointer border-none outline-none appearance-none px-1"
        >
          {speedOptions.map(s => (
            <option key={s} value={s} className="bg-zinc-900">{s}×</option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.06]" />

      {/* Master Volume */}
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={playback.masterVolume}
          onChange={(e) => onSetMasterVolume(parseFloat(e.target.value))}
          className="w-16 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
            [&::-webkit-slider-thumb]:bg-zinc-300 [&::-webkit-slider-thumb]:rounded-full"
        />
        <span className="text-[10px] text-zinc-500 font-mono w-7 text-right">
          {Math.round(playback.masterVolume * 100)}
        </span>
      </div>
    </div>
  );
}
