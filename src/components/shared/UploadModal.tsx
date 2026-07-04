import { useCallback, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { Button } from './Button';
import {
  isAudioFile,
  isImageFile,
  isSupportedFile,
  getAudioDuration,
  generateId,
  getMediaType,
} from '../../utils/fileHelpers';
import type { AudioTrack, BackgroundMedia } from '../../types';
import { TRACK_COLORS } from '../../types';

export function UploadModal() {
  const { state, addTracks, setBackground, toggleUploadModal } = useEditor();
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setProcessing(true);
      setError(null);

      const fileArray = Array.from(files);
      const unsupported = fileArray.filter(f => !isSupportedFile(f.name));

      if (unsupported.length > 0) {
        setError(`Unsupported file format: ${unsupported.map(f => f.name).join(', ')}`);
      }

      const audioFiles = fileArray.filter(f => isAudioFile(f.name));
      const imageFiles = fileArray.filter(f => isImageFile(f.name));

      // Process audio files
      if (audioFiles.length > 0) {
        const newTracks: AudioTrack[] = [];
        for (const file of audioFiles) {
          try {
            const duration = await getAudioDuration(file);
            newTracks.push({
              id: generateId(),
              name: file.name,
              file,
              duration,
              trimStart: 0,
              trimEnd: duration,
              order: 0, // Will be set by reducer
              size: file.size,
              previewUrl: URL.createObjectURL(file),
              volume: 1,
              gain: 0,
              pan: 0,
              fadeIn: 0,
              fadeOut: 0,
              muted: false,
              solo: false,
              locked: false,
              color: TRACK_COLORS[(state.tracks.length + newTracks.length) % TRACK_COLORS.length],
            });
          } catch {
            setError(prev => `${prev ? prev + '\n' : ''}${file.name} could not be read.`);
          }
        }
        if (newTracks.length > 0) addTracks(newTracks);
      }

      // Process image/background — use the last one
      if (imageFiles.length > 0) {
        const file = imageFiles[imageFiles.length - 1];
        const bg: BackgroundMedia = {
          file,
          type: getMediaType(file.name),
          name: file.name,
          previewUrl: URL.createObjectURL(file),
        };
        setBackground(bg);
      }

      setProcessing(false);
      if (audioFiles.length > 0 || imageFiles.length > 0) {
        toggleUploadModal(false);
      }
    },
    [addTracks, setBackground, toggleUploadModal]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        await processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  if (!state.isUploadModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => toggleUploadModal(false)}
    >
      <div
        className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl shadow-black/50 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Upload Files</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Audio files (.mp3, .wav) and background media (.png, .jpg, .gif)
            </p>
          </div>
          <button
            onClick={() => toggleUploadModal(false)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12
            flex flex-col items-center justify-center gap-4
            transition-all duration-200 cursor-pointer
            ${
              isDragging
                ? 'border-violet-500 bg-violet-500/10 scale-[1.02]'
                : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Upload icon */}
          <div
            className={`
              p-4 rounded-full transition-all duration-200
              ${isDragging ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-zinc-500'}
            `}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">
              {isDragging ? 'Drop files here...' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              MP3, WAV, OGG, PNG, JPG, GIF
            </p>
          </div>

          {processing && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-xl">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-violet-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-zinc-300">Processing files...</span>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          id="upload-modal-file-input"
          ref={fileInputRef}
          type="file"
          multiple
          accept=".mp3,.wav,.ogg,.flac,.aac,.m4a,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Quick info */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-2 h-2 rounded-full bg-cyan-500/60" />
            Audio files are added as tracks
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-2 h-2 rounded-full bg-violet-500/60" />
            Images are set as background
          </div>
        </div>
      </div>
    </div>
  );
}
