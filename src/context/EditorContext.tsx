import { createContext } from 'react';
import type { EditorState, EditorAction } from '../types';

// ─── Initial State ─────────────────────────────────────────────
export const initialRenderState = {
  status: 'idle' as const,
  progress: 0,
  outputUrl: null,
  outputFilename: null,
  error: null,
  logs: [],
};

export const initialEditorState: EditorState = {
  tracks: [],
  backgroundMedia: null,
  outputFormat: '.mp4',
  renderState: initialRenderState,
  isUploadModalOpen: false,
};

// ─── Reducer ───────────────────────────────────────────────────
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_TRACKS': {
      const maxOrder = state.tracks.length > 0
        ? Math.max(...state.tracks.map(t => t.order))
        : -1;
      const newTracks = action.payload.map((track, i) => ({
        ...track,
        order: maxOrder + 1 + i,
      }));
      return { ...state, tracks: [...state.tracks, ...newTracks] };
    }

    case 'REMOVE_TRACK': {
      const filtered = state.tracks.filter(t => t.id !== action.payload);
      // Re-index orders
      const reindexed = filtered.map((t, i) => ({ ...t, order: i }));
      return { ...state, tracks: reindexed };
    }

    case 'REORDER_TRACKS':
      return { ...state, tracks: action.payload.map((t, i) => ({ ...t, order: i })) };

    case 'UPDATE_TRIM':
      return {
        ...state,
        tracks: state.tracks.map(t =>
          t.id === action.payload.id
            ? { ...t, trimStart: action.payload.trimStart, trimEnd: action.payload.trimEnd }
            : t
        ),
      };

    case 'SET_BACKGROUND':
      return { ...state, backgroundMedia: action.payload };

    case 'SET_FORMAT':
      return { ...state, outputFormat: action.payload };

    case 'SET_RENDER_STATE':
      return {
        ...state,
        renderState: { ...state.renderState, ...action.payload },
      };

    case 'TOGGLE_UPLOAD_MODAL':
      return {
        ...state,
        isUploadModalOpen: action.payload ?? !state.isUploadModalOpen,
      };

    case 'RESET':
      // Revoke all object URLs
      state.tracks.forEach(t => URL.revokeObjectURL(t.previewUrl));
      if (state.backgroundMedia) URL.revokeObjectURL(state.backgroundMedia.previewUrl);
      if (state.renderState.outputUrl) URL.revokeObjectURL(state.renderState.outputUrl);
      return initialEditorState;

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────
export interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export const EditorContext = createContext<EditorContextValue | null>(null);
