import { useEditor } from '../../hooks/useEditor';
import { formatDuration } from '../../utils/fileHelpers';

interface ToolbarProps {
  onImport: () => void;
  onExport: () => void;
}

export function Toolbar({ onImport, onExport }: ToolbarProps) {
  const { state, undo, redo, canUndo, canRedo, reset, toggleSettings } = useEditor();
  const trackCount = state.tracks.length;

  return (
    <header className="relative z-20 flex items-center h-11 px-3 border-b border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-md shadow-violet-500/20">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <span className="text-sm font-bold text-zinc-200 tracking-tight hidden sm:inline">
          Suno<span className="text-violet-400">Craft</span>
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.08] mr-2" />

      {/* Project Actions */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          title="New Project"
          onClick={() => { if (trackCount > 0 && confirm('Start a new project? Current work will be lost.')) reset(); }}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          title="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>}
        />
        <ToolbarButton
          title="Redo (Ctrl+Shift+Z)"
          onClick={redo}
          disabled={!canRedo}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/[0.08] mx-1" />

      {/* Import */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          title="Import Files (Ctrl+I)"
          onClick={onImport}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>}
          label="Import"
          accent
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      {trackCount > 0 && (
        <div className="hidden md:flex items-center gap-3 mr-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
            <span className="text-[11px] text-zinc-400">
              <span className="text-zinc-200 font-semibold">{trackCount}</span> {trackCount === 1 ? 'track' : 'tracks'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            <span className="text-zinc-300 font-mono">{formatDuration(state.tracks.reduce((s, t) => s + (t.trimEnd - t.trimStart), 0))}</span>
          </div>
        </div>
      )}

      {/* Right Actions */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          title="Export"
          onClick={onExport}
          disabled={trackCount === 0}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>}
          label="Export"
        />
        <ToolbarButton
          title="Settings"
          onClick={() => toggleSettings()}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
      </div>
    </header>
  );
}

// ─── Toolbar Button Component ──────────────────────────────────
function ToolbarButton({
  icon,
  label,
  title,
  onClick,
  disabled,
  accent,
}: {
  icon: React.ReactNode;
  label?: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium
        transition-all duration-150
        disabled:opacity-30 disabled:cursor-not-allowed
        ${accent
          ? 'text-violet-400 hover:bg-violet-500/15 hover:text-violet-300'
          : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
        }
      `}
    >
      {icon}
      {label && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}
