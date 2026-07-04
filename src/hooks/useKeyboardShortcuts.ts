import { useEffect, useCallback } from 'react';
import { useEditor } from './useEditor';

/**
 * Global keyboard shortcuts for SunoCraft.
 * Must be used once at the app level.
 */
export function useKeyboardShortcuts(actions: {
  togglePlayPause: () => void;
  stop: () => void;
}) {
  const {
    undo, redo, canUndo, canRedo,
    removeTrack, activeTrack, splitTrack,
    state, setPlayback, setTimelineZoom,
    toggleUploadModal,
  } = useEditor();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key.toLowerCase();

    // Space → Play/Pause
    if (key === ' ') {
      e.preventDefault();
      actions.togglePlayPause();
      return;
    }

    // Ctrl+Z → Undo
    if (ctrl && !shift && key === 'z') {
      e.preventDefault();
      if (canUndo) undo();
      return;
    }

    // Ctrl+Shift+Z → Redo
    if (ctrl && shift && key === 'z') {
      e.preventDefault();
      if (canRedo) redo();
      return;
    }

    // Delete / Backspace → Remove active track
    if ((key === 'delete' || key === 'backspace') && activeTrack && !activeTrack.locked) {
      e.preventDefault();
      removeTrack(activeTrack.id);
      return;
    }

    // S → Split at playhead
    if (!ctrl && key === 's' && activeTrack) {
      e.preventDefault();
      const { currentTime } = state.playback;
      // Calculate if playhead is within this track's range
      // For now, split at current time
      if (currentTime > activeTrack.trimStart && currentTime < activeTrack.trimEnd) {
        const firstId = activeTrack.id;
        const secondId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        splitTrack(activeTrack.id, currentTime, firstId, secondId);
      }
      return;
    }

    // L → Toggle loop
    if (!ctrl && key === 'l') {
      e.preventDefault();
      setPlayback({ isLooping: !state.playback.isLooping });
      return;
    }

    // + / = → Zoom in
    if (key === '+' || key === '=') {
      e.preventDefault();
      setTimelineZoom(state.timelineZoom + 10);
      return;
    }

    // - → Zoom out
    if (key === '-') {
      e.preventDefault();
      setTimelineZoom(state.timelineZoom - 10);
      return;
    }

    // Ctrl+I or Ctrl+O → Import
    if (ctrl && (key === 'i' || key === 'o')) {
      e.preventDefault();
      toggleUploadModal(true);
      return;
    }

    // Escape → Stop playback
    if (key === 'escape') {
      actions.stop();
      return;
    }
  }, [
    actions, undo, redo, canUndo, canRedo,
    removeTrack, activeTrack, splitTrack,
    state.playback, setPlayback, setTimelineZoom,
    toggleUploadModal,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
