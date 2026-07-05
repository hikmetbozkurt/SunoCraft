import { useEffect, useRef } from 'react';
import type { BackgroundMedia } from '../../types';

interface VideoPreviewProps {
  media: BackgroundMedia;
  isPlaying: boolean;
  currentTime: number;
}

export function VideoPreview({ media, isPlaying, currentTime }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play/Pause sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Current time sync (with loop wrapping and threshold filters to avoid seek jitter)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    if (video.duration && isFinite(video.duration)) {
      const targetTime = currentTime % video.duration;
      // Seek if drifted by more than 0.25 seconds
      if (Math.abs(video.currentTime - targetTime) > 0.25) {
        video.currentTime = targetTime;
      }
    }
  }, [currentTime, isPlaying]);

  if (media.type === 'video') {
    return (
      <video
        ref={videoRef}
        src={media.previewUrl}
        className="max-w-full max-h-full object-contain"
        loop
        muted
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
