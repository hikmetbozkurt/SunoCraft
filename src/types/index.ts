// ─── Audio Track ───────────────────────────────────────────────
export interface AudioTrack {
  id: string;
  name: string;
  file: File;
  duration: number;       // toplam süre (saniye)
  trimStart: number;      // kırpma başlangıcı (saniye)
  trimEnd: number;        // kırpma bitişi (saniye)
  order: number;          // sıralama indeksi
  size: number;           // dosya boyutu (byte)
  previewUrl: string;     // Object URL for audio preview
  // ─── New Properties ───
  volume: number;         // 0-1 (track volume)
  gain: number;           // dB offset (-20 to +20)
  pan: number;            // -1 (left) to 1 (right)
  fadeIn: number;         // fade-in duration in seconds
  fadeOut: number;        // fade-out duration in seconds
  muted: boolean;
  solo: boolean;
  locked: boolean;
  color: string;          // hex color for track indicator
}

// ─── Background Media ──────────────────────────────────────────
export type BackgroundMediaType = 'image' | 'gif' | 'video';

export interface BackgroundMedia {
  file: File;
  type: BackgroundMediaType;
  name: string;
  previewUrl: string;
}

// ─── Output Settings ───────────────────────────────────────────
export type OutputFormat = '.mp4' | '.mp3' | '.wav';

// ─── Render State ──────────────────────────────────────────────
export type RenderStatus =
  | 'idle'
  | 'loading-ffmpeg'
  | 'processing'
  | 'completed'
  | 'error';

export interface RenderState {
  status: RenderStatus;
  progress: number;       // 0-100
  outputUrl: string | null;
  outputFilename: string | null;
  error: string | null;
  logs: string[];
}

// ─── Playback State ────────────────────────────────────────────
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;    // position in the full composition (seconds)
  isLooping: boolean;
  playbackSpeed: number;  // 0.5, 1, 1.5, 2
  masterVolume: number;   // 0-1
}

// ─── Toast ─────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;      // ms, default 3000
}

// ─── Track Colors ──────────────────────────────────────────────
export const TRACK_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f97316', // orange
] as const;

// ─── Editor State ──────────────────────────────────────────────
export interface EditorState {
  tracks: AudioTrack[];
  backgroundMedia: BackgroundMedia | null;
  outputFormat: OutputFormat;
  renderState: RenderState;
  playback: PlaybackState;
  isUploadModalOpen: boolean;
  isExportDialogOpen: boolean;
  isSettingsOpen: boolean;
  activeTrackId: string | null;
  timelineZoom: number;   // pixels per second
  sidebarWidth: number;
  propertiesWidth: number;
  previewHeight: number;  // percentage of center area
}

// ─── Editor Actions ────────────────────────────────────────────
export type EditorAction =
  // Track management
  | { type: 'ADD_TRACKS'; payload: AudioTrack[] }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'REORDER_TRACKS'; payload: AudioTrack[] }
  | { type: 'UPDATE_TRIM'; payload: { id: string; trimStart: number; trimEnd: number } }
  | { type: 'SPLIT_TRACK'; payload: { id: string; splitTime: number; firstPartId: string; secondPartId: string } }
  // Track properties
  | { type: 'SET_TRACK_VOLUME'; payload: { id: string; volume: number } }
  | { type: 'SET_TRACK_GAIN'; payload: { id: string; gain: number } }
  | { type: 'SET_TRACK_PAN'; payload: { id: string; pan: number } }
  | { type: 'SET_TRACK_FADE'; payload: { id: string; fadeIn: number; fadeOut: number } }
  | { type: 'TOGGLE_MUTE'; payload: string }
  | { type: 'TOGGLE_SOLO'; payload: string }
  | { type: 'TOGGLE_LOCK'; payload: string }
  | { type: 'SET_TRACK_COLOR'; payload: { id: string; color: string } }
  | { type: 'RENAME_TRACK'; payload: { id: string; name: string } }
  // Background
  | { type: 'SET_BACKGROUND'; payload: BackgroundMedia | null }
  // Format & export
  | { type: 'SET_FORMAT'; payload: OutputFormat }
  | { type: 'SET_RENDER_STATE'; payload: Partial<RenderState> }
  | { type: 'TOGGLE_EXPORT_DIALOG'; payload?: boolean }
  // Playback
  | { type: 'SET_PLAYBACK'; payload: Partial<PlaybackState> }
  // UI state
  | { type: 'TOGGLE_UPLOAD_MODAL'; payload?: boolean }
  | { type: 'TOGGLE_SETTINGS'; payload?: boolean }
  | { type: 'SET_ACTIVE_TRACK'; payload: string | null }
  | { type: 'SET_TIMELINE_ZOOM'; payload: number }
  | { type: 'SET_PANEL_SIZE'; payload: { panel: 'sidebar' | 'properties' | 'preview'; size: number } }
  // Undo / Redo
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // Reset
  | { type: 'RESET' };
