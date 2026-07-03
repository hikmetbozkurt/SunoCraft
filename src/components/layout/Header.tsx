import { useEditor } from '../../hooks/useEditor';
import { Button } from '../shared/Button';
import { formatDuration } from '../../utils/fileHelpers';

export function Header() {
  const { state, toggleUploadModal, reset, totalDuration } = useEditor();
  const trackCount = state.tracks.length;

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      {/* Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          {/* Glow */}
          <div className="absolute -inset-1 rounded-xl bg-violet-500/20 blur-md -z-10" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Suno<span className="text-violet-400">Craft</span>
          </h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
            Creator Studio
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6">
        {trackCount > 0 && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs text-zinc-400">
                <span className="text-zinc-200 font-semibold">{trackCount}</span> {trackCount === 1 ? 'track' : 'tracks'}
              </span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="text-xs text-zinc-400">
              Total: <span className="text-zinc-200 font-mono font-semibold">{formatDuration(totalDuration)}</span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => toggleUploadModal(true)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        >
          Add File
        </Button>
        {trackCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
        )}
      </div>
    </header>
  );
}
