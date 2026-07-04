import type { BackgroundMedia } from '../../types';

interface VideoPreviewProps {
  media: BackgroundMedia;
  isPlaying: boolean;
}

export function VideoPreview({ media, isPlaying }: VideoPreviewProps) {
  if (media.type === 'video') {
    return (
      <video
        src={media.previewUrl}
        className="max-w-full max-h-full object-contain"
        loop
        muted
        autoPlay={isPlaying}
        playsInline
      />
    );
  }

  // Image or GIF
  return (
    <img
      src={media.previewUrl}
      alt={media.name}
      className="max-w-full max-h-full object-contain"
    />
  );
}
