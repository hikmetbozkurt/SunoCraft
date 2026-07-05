import { createContext } from 'react';
import type { EditorState, EditorAction } from '../types';

// ─── Initial States ────────────────────────────────────────────
export const initialRenderState = {
  status: 'idle' as const,
  progress: 0,
  outputUrl: null,
  outputFilename: null,
  error: null,
  logs: [],
};

export const initialPlaybackState = {
  isPlaying: false,
  currentTime: 0,
  isLooping: false,
  playbackSpeed: 1,
  masterVolume: 0.8,
};

// Load persisted panel sizes from localStorage
function loadPanelSizes() {
  try {
    const saved = localStorage.getItem('sunocraft-panel-sizes');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
}

const savedPanels = loadPanelSizes();

export const initialEditorState: EditorState = {
  tracks: [],
  backgroundMedia: null,
  outputFormat: '.mp4',
  renderState: initialRenderState,
  playback: initialPlaybackState,
  isUploadModalOpen: false,
  isExportDialogOpen: false,
  isSettingsOpen: false,
  activeTrackId: null,
  timelineZoom: 40,
  sidebarWidth: savedPanels.sidebarWidth ?? 260,
  propertiesWidth: savedPanels.propertiesWidth ?? 280,
  previewHeight: savedPanels.previewHeight ?? 45,
};

// ─── Helper: update a single track by id ───────────────────────
function updateTrack(
  tracks: EditorState['tracks'],
  id: string,
  updater: (t: EditorState['tracks'][0]) => EditorState['tracks'][0]
) {
  return tracks.map(t => (t.id === id ? updater(t) : t));
}

// ─── Core Reducer ──────────────────────────────────────────────
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    // ── Track Management ────────────────────────────────────────
    case 'ADD_TRACKS': {
      const maxOrder = state.tracks.length > 0
        ? Math.max(...state.tracks.map(t => t.order))
        : -1;
      const newTracks = action.payload.map((track, i) => ({
        ...track,
        order: maxOrder + 1 + i,
      }));
      const firstNewTrackId = newTracks[0]?.id || null;
      return {
        ...state,
        tracks: [...state.tracks, ...newTracks],
        activeTrackId: state.activeTrackId || firstNewTrackId,
      };
    }

    case 'REMOVE_TRACK': {
      const filtered = state.tracks.filter(t => t.id !== action.payload);
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
        tracks: updateTrack(state.tracks, action.payload.id, t => ({
          ...t,
          trimStart: action.payload.trimStart,
          trimEnd: action.payload.trimEnd,
        })),
      };

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

    // ── Track Properties ────────────────────────────────────────
    case 'SET_TRACK_VOLUME':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload.id, t => ({
          ...t, volume: action.payload.volume,
        })),
      };

    case 'SET_TRACK_GAIN':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload.id, t => ({
          ...t, gain: action.payload.gain,
        })),
      };

    case 'SET_TRACK_PAN':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload.id, t => ({
          ...t, pan: action.payload.pan,
        })),
      };

    case 'SET_TRACK_FADE':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload.id, t => ({
          ...t, fadeIn: action.payload.fadeIn, fadeOut: action.payload.fadeOut,
        })),
      };

    case 'TOGGLE_MUTE':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload, t => ({
          ...t, muted: !t.muted,
        })),
      };

    case 'TOGGLE_SOLO':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload, t => ({
          ...t, solo: !t.solo,
        })),
      };

    case 'TOGGLE_LOCK':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload, t => ({
          ...t, locked: !t.locked,
        })),
      };

    case 'SET_TRACK_COLOR':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload.id, t => ({
          ...t, color: action.payload.color,
        })),
      };

    case 'RENAME_TRACK':
      return {
        ...state,
        tracks: updateTrack(state.tracks, action.payload.id, t => ({
          ...t, name: action.payload.name,
        })),
      };

    // ── Background ──────────────────────────────────────────────
    case 'SET_BACKGROUND':
      return { ...state, backgroundMedia: action.payload };

    // ── Format & Export ─────────────────────────────────────────
    case 'SET_FORMAT':
      return { ...state, outputFormat: action.payload };

    case 'SET_RENDER_STATE':
      return {
        ...state,
        renderState: { ...state.renderState, ...action.payload },
      };

    case 'TOGGLE_EXPORT_DIALOG':
      return {
        ...state,
        isExportDialogOpen: action.payload ?? !state.isExportDialogOpen,
      };

    // ── Playback ────────────────────────────────────────────────
    case 'SET_PLAYBACK':
      return {
        ...state,
        playback: { ...state.playback, ...action.payload },
      };

    // ── UI State ────────────────────────────────────────────────
    case 'TOGGLE_UPLOAD_MODAL':
      return {
        ...state,
        isUploadModalOpen: action.payload ?? !state.isUploadModalOpen,
      };

    case 'TOGGLE_SETTINGS':
      return {
        ...state,
        isSettingsOpen: action.payload ?? !state.isSettingsOpen,
      };

    case 'SET_ACTIVE_TRACK':
      return { ...state, activeTrackId: action.payload };

    case 'SET_TIMELINE_ZOOM':
      return { ...state, timelineZoom: Math.max(10, Math.min(200, action.payload)) };

    case 'SET_PANEL_SIZE': {
      const { panel, size } = action.payload;
      const key = panel === 'sidebar' ? 'sidebarWidth'
        : panel === 'properties' ? 'propertiesWidth'
        : 'previewHeight';
      const newState = { ...state, [key]: size };
      // Persist panel sizes
      try {
        localStorage.setItem('sunocraft-panel-sizes', JSON.stringify({
          sidebarWidth: newState.sidebarWidth,
          propertiesWidth: newState.propertiesWidth,
          previewHeight: newState.previewHeight,
        }));
      } catch { /* ignore */ }
      return newState;
    }

    // ── Undo / Redo ─────────────────────────────────────────────
    // Handled by the undo/redo wrapper in EditorProvider
    case 'UNDO':
    case 'REDO':
      return state;

    // ── Snapshot Restore (undo/redo — does NOT revoke URLs) ────
    case 'RESTORE_SNAPSHOT':
      return {
        ...action.payload,
        // Preserve current UI panel sizes
        sidebarWidth: state.sidebarWidth,
        propertiesWidth: state.propertiesWidth,
        previewHeight: state.previewHeight,
        // Preserve transient UI state
        renderState: state.renderState,
        playback: state.playback,
        isUploadModalOpen: state.isUploadModalOpen,
        isExportDialogOpen: state.isExportDialogOpen,
        isSettingsOpen: state.isSettingsOpen,
      };

    // ── Reset ───────────────────────────────────────────────────
    case 'RESET':
      state.tracks.forEach(t => URL.revokeObjectURL(t.previewUrl));
      if (state.backgroundMedia) URL.revokeObjectURL(state.backgroundMedia.previewUrl);
      if (state.renderState.outputUrl) URL.revokeObjectURL(state.renderState.outputUrl);
      return {
        ...initialEditorState,
        sidebarWidth: state.sidebarWidth,
        propertiesWidth: state.propertiesWidth,
        previewHeight: state.previewHeight,
      };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────
export interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  canUndo: boolean;
  canRedo: boolean;
}

export const EditorContext = createContext<EditorContextValue | null>(null);
