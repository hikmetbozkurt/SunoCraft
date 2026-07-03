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

// ─── Editor State ──────────────────────────────────────────────
export interface EditorState {
  tracks: AudioTrack[];
  backgroundMedia: BackgroundMedia | null;
  outputFormat: OutputFormat;
  renderState: RenderState;
  isUploadModalOpen: boolean;
}

// ─── Editor Actions ────────────────────────────────────────────
export type EditorAction =
  | { type: 'ADD_TRACKS'; payload: AudioTrack[] }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'REORDER_TRACKS'; payload: AudioTrack[] }
  | { type: 'UPDATE_TRIM'; payload: { id: string; trimStart: number; trimEnd: number } }
  | { type: 'SET_BACKGROUND'; payload: BackgroundMedia | null }
  | { type: 'SET_FORMAT'; payload: OutputFormat }
  | { type: 'SET_RENDER_STATE'; payload: Partial<RenderState> }
  | { type: 'TOGGLE_UPLOAD_MODAL'; payload?: boolean }
  | { type: 'RESET' };
