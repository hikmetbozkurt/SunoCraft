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
  activeTrackId: null,
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
      // Auto-select the first added track if none is active
      const firstNewTrackId = newTracks[0]?.id || null;
      return {
        ...state,
        tracks: [...state.tracks, ...newTracks],
        activeTrackId: state.activeTrackId || firstNewTrackId,
      };
    }

    case 'REMOVE_TRACK': {
      const filtered = state.tracks.filter(t => t.id !== action.payload);
      // Re-index orders
      const reindexed = filtered.map((t, i) => ({ ...t, order: i }));
      const isActiveRemoved = state.activeTrackId === action.payload;
      return {
        ...state,
        tracks: reindexed,
        activeTrackId: isActiveRemoved
          ? (reindexed[0]?.id || null)
          : state.activeTrackId,
      };
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

    case 'SET_ACTIVE_TRACK':
      return { ...state, activeTrackId: action.payload };

    case 'SPLIT_TRACK': {
      const { id, splitTime, firstPartId, secondPartId } = action.payload;
      const targetIndex = state.tracks.findIndex(t => t.id === id);
      if (targetIndex === -1) return state;

      const target = state.tracks[targetIndex];

      const ext = target.name.substring(target.name.lastIndexOf('.'));
      const baseName = target.name.substring(0, target.name.lastIndexOf('.'));
      const part1 = {
        ...target,
        id: firstPartId,
        name: `${baseName} (Part 1)${ext}`,
        trimEnd: splitTime,
      };

      const part2 = {
        ...target,
        id: secondPartId,
        name: `${baseName} (Part 2)${ext}`,
        trimStart: splitTime,
        previewUrl: URL.createObjectURL(target.file),
      };
      const newTracks = [...state.tracks];
      newTracks.splice(targetIndex, 1, part1, part2);

      const reindexed = newTracks.map((t, i) => ({ ...t, order: i }));

      return {
        ...state,
        tracks: reindexed,
        activeTrackId: firstPartId,
      };
    }

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
