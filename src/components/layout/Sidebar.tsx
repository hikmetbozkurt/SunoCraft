import { useCallback, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { formatDuration, formatFileSize } from '../../utils/fileHelpers';
import type { AudioTrack } from '../../types';

export function Sidebar() {
  const { state, sortedTracks, setActiveTrack, removeTrack, toggleUploadModal } = useEditor();
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const filteredTracks = searchQuery
    ? sortedTracks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedTracks;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // The upload modal handles actual file processing
    if (e.dataTransfer.files.length > 0) {
      toggleUploadModal(true);
    }
  }, [toggleUploadModal]);

  return (
    <div
      className="h-full flex flex-col bg-zinc-950/40 select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/[0.04]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
            Assets
          </h2>
          <button
            onClick={() => toggleUploadModal(true)}
            className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
            title="Import Files"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-white/[0.03] border border-white/[0.06] rounded-md text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Audio Tracks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sortedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-white/[0.03] flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-[11px] text-zinc-500">No audio files imported</p>
            <button
              onClick={() => toggleUploadModal(true)}
              className="mt-2 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              + Import Files
            </button>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {/* Section Header */}
            <div className="px-2 py-1 text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
              Audio ({filteredTracks.length})
            </div>
            {filteredTracks.map(track => (
              <SidebarTrackItem
                key={track.id}
                track={track}
                isActive={state.activeTrackId === track.id}
                onSelect={() => setActiveTrack(track.id)}
                onRemove={() => removeTrack(track.id)}
              />
            ))}

            {/* Background Media Section */}
            {state.backgroundMedia && (
              <>
                <div className="px-2 py-1 mt-2 text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                  Background
                </div>
                <div className="px-2 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                      <img
                        src={state.backgroundMedia.previewUrl}
                        alt={state.backgroundMedia.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400 truncate flex-1">{state.backgroundMedia.name}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Drop Zone Overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-violet-500/10 border-2 border-dashed border-violet-500/40 rounded-lg flex items-center justify-center z-10">
          <p className="text-sm text-violet-400 font-medium">Drop files here</p>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Track Item ────────────────────────────────────────
function SidebarTrackItem({
  track,
  isActive,
  onSelect,
  onRemove,
}: {
  track: AudioTrack;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const effectiveDuration = track.trimEnd - track.trimStart;

  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all duration-100 group
        ${isActive
          ? 'bg-violet-500/10 border border-violet-500/20'
          : 'border border-transparent hover:bg-white/[0.03]'
        }
      `}
    >
      {/* Color dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: track.color }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] truncate font-medium ${isActive ? 'text-violet-300' : 'text-zinc-300'}`}>
          {track.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-zinc-500 font-mono">{formatDuration(effectiveDuration)}</span>
          <span className="text-[10px] text-zinc-600">{formatFileSize(track.size)}</span>
          {track.muted && <span className="text-[9px] text-red-400/60">M</span>}
          {track.solo && <span className="text-[9px] text-amber-400/60">S</span>}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </button>
  );
}
