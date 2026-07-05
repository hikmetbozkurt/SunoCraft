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
  const { sortedTracks, reorderTracks, toggleUploadModal, state, setTimelineZoom } = useEditor();

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setTimelineZoom(state.timelineZoom + (e.deltaY < 0 ? 5 : -5));
    }
  }, [state.timelineZoom, setTimelineZoom]);

  if (sortedTracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-xl bg-white/[0.03] flex items-center justify-center">
            <svg className="w-7 h-7 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400">No tracks</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Import audio files to start
            </p>
          </div>
          <button
            onClick={() => toggleUploadModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Import
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" onWheel={handleWheel}>
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Timeline</h3>
          <span className="text-[10px] text-zinc-600">{sortedTracks.length} clips</span>
          <button
            onClick={() => toggleUploadModal(true)}
            className="flex items-center gap-1 ml-2 px-2 py-0.5 text-[9px] font-medium text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded transition-all"
          >
            + Add Song
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">Ctrl+Scroll to zoom</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTimelineZoom(state.timelineZoom - 10)}
              className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] text-[11px] font-bold"
            >
              −
            </button>
            <span className="text-[10px] text-zinc-500 font-mono w-6 text-center">{state.timelineZoom}</span>
            <button
              onClick={() => setTimelineZoom(state.timelineZoom + 10)}
              className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] text-[11px] font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="space-y-1">
            {sortedTracks.map((track, index) => (
              <SortableTrack key={track.id} track={track} index={index} />
            ))}
          </div>
        </DragDropProvider>
      </div>
    </div>
  );
}
