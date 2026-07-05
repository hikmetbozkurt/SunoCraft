import { useEffect, useRef, useCallback } from 'react';

interface AudioMeterProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
}

export function AudioMeter({ analyserRef, isPlaying }: AudioMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas dynamically to match layout CSS dimensions and device pixel ratio
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS levels for L and R (approximate with frequency bands)
    const half = Math.floor(dataArray.length / 2);
    let sumL = 0, sumR = 0;

    for (let i = 0; i < half; i++) {
      sumL += dataArray[i];
      sumR += dataArray[i + half];
    }

    const levelL = Math.min(1, (sumL / half / 255) * 2);
    const levelR = Math.min(1, (sumR / half / 255) * 2);

    // Compute dynamic bar width and gap based on actual canvas dimensions
    const barWidth = Math.max(2, Math.floor(width * 0.35));
    const gap = Math.max(1, Math.floor(width * 0.1));
    const x1 = Math.floor((width - barWidth * 2 - gap) / 2);
    const x2 = x1 + barWidth + gap;

    // Draw meter backgrounds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(x1, 0, barWidth, height);
    ctx.fillRect(x2, 0, barWidth, height);

    // Draw levels
    const drawLevel = (x: number, level: number) => {
      const barHeight = level * height;
      const y = height - barHeight;

      // Gradient: green → yellow → red
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)');    // emerald
      gradient.addColorStop(0.6, 'rgba(250, 204, 21, 0.8)');  // yellow
      gradient.addColorStop(0.85, 'rgba(239, 68, 68, 0.9)');  // red

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    };

    drawLevel(x1, levelL);
    drawLevel(x2, levelR);

    // Peak indicators (small bright dots at peak)
    const drawPeak = (x: number, level: number) => {
      const y = height - level * height;
      ctx.fillStyle = level > 0.85 ? '#ef4444' : level > 0.6 ? '#facc15' : '#10b981';
      ctx.fillRect(x, Math.max(0, y - 2), barWidth, 2);
    };

    drawPeak(x1, levelL);
    drawPeak(x2, levelR);

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [analyserRef, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, draw]);

  return (
    <div className="w-6 h-full bg-zinc-950/80 border-l border-white/[0.06] flex items-center justify-center py-2 flex-shrink-0">
      <canvas
        ref={canvasRef}
        className="w-3.5 h-[90%]"
      />
    </div>
  );

}
