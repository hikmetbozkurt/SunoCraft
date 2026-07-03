import { useCallback } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useEditor } from '../../hooks/useEditor';
import { TrackItem } from './TrackItem';
import type { AudioTrack } from '../../types';

// ─── Sortable Wrapper ──────────────────────────────────────────
function SortableTrack({ track, index }: { track: AudioTrack; index: number }) {
  const { ref } = useSortable({ id: track.id, index });

  return (
    <div ref={ref} data-track-id={track.id}>
      <TrackItem track={track} index={index} />
    </div>
  );
}

// ─── Timeline ──────────────────────────────────────────────────
export function Timeline() {
  const { sortedTracks, reorderTracks, toggleUploadModal } = useEditor();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback(
    (event: any) => {
      const { source, target } = event.operation;
      if (!source?.sortable || !target?.sortable) return;

      const oldIndex = source.sortable.initialIndex as number;
      const newIndex = target.sortable.index as number;

      if (oldIndex === newIndex) return;

      const newTracks = [...sortedTracks];
      const [moved] = newTracks.splice(oldIndex, 1);
      newTracks.splice(newIndex, 0, moved);
      reorderTracks(newTracks);
    },
    [sortedTracks, reorderTracks]
  );

  if (sortedTracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-4">
          {/* Empty state illustration */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">No tracks added yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Upload audio files to start editing
            </p>
          </div>
          <button
            onClick={() => toggleUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 rounded-xl transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload Files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Timeline
        </h2>
        <span className="text-[11px] text-zinc-600">
          Drag to reorder
        </span>
      </div>
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className="space-y-2">
          {sortedTracks.map((track, index) => (
            <SortableTrack key={track.id} track={track} index={index} />
          ))}
        </div>
      </DragDropProvider>
    </div>
  );
}
