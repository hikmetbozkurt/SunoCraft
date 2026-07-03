// ─── File Size Formatting ──────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ─── Duration Formatting ───────────────────────────────────────
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── File Extension ────────────────────────────────────────────
export function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot >= 0 ? name.slice(lastDot).toLowerCase() : '';
}

// ─── File Type Checks ──────────────────────────────────────────
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];

export function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.includes(getFileExtension(name));
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(name));
}

export function isSupportedFile(name: string): boolean {
  return isAudioFile(name) || isImageFile(name);
}

// ─── Audio Duration via HTML5 Audio API ────────────────────────
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      resolve(isFinite(duration) ? duration : 0);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be read.`));
    });

    audio.src = url;
  });
}

// ─── Generate Unique ID ───────────────────────────────────────
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Determine Background Media Type ──────────────────────────
export function getMediaType(name: string): 'image' | 'gif' | 'video' {
  const ext = getFileExtension(name);
  if (ext === '.gif') return 'gif';
  if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video';
  return 'image';
}
