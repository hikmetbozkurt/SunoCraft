import { useReducer, useCallback, useRef, type ReactNode } from 'react';
import { EditorContext, editorReducer, initialEditorState } from './EditorContext';
import type { EditorState, EditorAction } from '../types';

// ─── Undo/Redo History ─────────────────────────────────────────
const MAX_HISTORY = 50;

// Actions that should NOT be recorded in undo history
const NON_UNDOABLE_ACTIONS = new Set([
  'SET_RENDER_STATE',
  'SET_PLAYBACK',
  'TOGGLE_UPLOAD_MODAL',
  'TOGGLE_EXPORT_DIALOG',
  'TOGGLE_SETTINGS',
  'SET_ACTIVE_TRACK',
  'SET_TIMELINE_ZOOM',
  'SET_PANEL_SIZE',
  'UNDO',
  'REDO',
  'RESTORE_SNAPSHOT',
]);

/**
 * Extracts only the undoable portions of state for snapshot comparison.
 * This avoids saving transient UI state in the undo history.
 */
function takeSnapshot(state: EditorState) {
  return {
    tracks: state.tracks,
    backgroundMedia: state.backgroundMedia,
    outputFormat: state.outputFormat,
    activeTrackId: state.activeTrackId,
    timelineZoom: state.timelineZoom,
  };
}

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [state, baseDispatch] = useReducer(editorReducer, initialEditorState);

  // Undo/redo stacks (store full snapshots of editor state)
  const pastRef = useRef<EditorState[]>([]);
  const futureRef = useRef<EditorState[]>([]);

  const dispatch = useCallback((action: EditorAction) => {
    if (action.type === 'UNDO') {
      const past = pastRef.current;
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      pastRef.current = past.slice(0, -1);
      futureRef.current = [state, ...futureRef.current].slice(0, MAX_HISTORY);
      // Atomic state swap — does NOT revoke Object URLs
      baseDispatch({ type: 'RESTORE_SNAPSHOT', payload: previous });
      return;
    }

    if (action.type === 'REDO') {
      const future = futureRef.current;
      if (future.length === 0) return;
      const next = future[0];
      futureRef.current = future.slice(1);
      pastRef.current = [...pastRef.current, state].slice(-MAX_HISTORY);
      // Atomic state swap — does NOT revoke Object URLs
      baseDispatch({ type: 'RESTORE_SNAPSHOT', payload: next });
      return;
    }

    // For undoable actions, save current state to history
    if (!NON_UNDOABLE_ACTIONS.has(action.type)) {
      pastRef.current = [...pastRef.current, state].slice(-MAX_HISTORY);
      futureRef.current = []; // Clear redo stack on new action
    }

    baseDispatch(action);
  }, [state, baseDispatch]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return (
    <EditorContext.Provider value={{ state, dispatch, canUndo, canRedo }}>
      {children}
    </EditorContext.Provider>
  );
}
