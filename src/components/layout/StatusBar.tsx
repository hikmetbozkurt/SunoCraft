import { useEditor } from '../../hooks/useEditor';
import { formatDuration } from '../../utils/fileHelpers';

export function StatusBar() {
  const { state, totalDuration } = useEditor();
  const { renderState, outputFormat, tracks } = state;

  const ffmpegStatus = (() => {
    switch (renderState.status) {
      case 'loading-ffmpeg': return { text: 'Loading FFmpeg…', color: 'text-amber-400' };
      case 'processing': return { text: `Processing ${renderState.progress}%`, color: 'text-violet-400' };
      case 'completed': return { text: 'Ready', color: 'text-emerald-400' };
      case 'error': return { text: 'Error', color: 'text-red-400' };
      default: return { text: 'Idle', color: 'text-zinc-500' };
    }
  })();

  const totalSize = tracks.reduce((s, t) => s + t.size, 0);
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex items-center h-6 px-3 border-t border-white/[0.04] bg-zinc-950/80 text-[10px] text-zinc-500 select-none gap-4">
      {/* Track count */}
      <span>
        <span className="text-zinc-400">{tracks.length}</span> tracks
      </span>

      {/* Duration */}
      <span>
        <span className="text-zinc-400 font-mono">{formatDuration(totalDuration)}</span> total
      </span>

      {/* Total file size */}
      {totalSize > 0 && (
        <span>
          <span className="text-zinc-400">{sizeMB}</span> MB
        </span>
      )}

      {/* Format */}
      <span>
        Format: <span className="text-zinc-400 uppercase">{outputFormat.replace('.', '')}</span>
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom */}
      <span>
        Zoom: <span className="text-zinc-400 font-mono">{state.timelineZoom}px/s</span>
      </span>

      {/* FFmpeg status */}
      <span className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full ${
          renderState.status === 'processing' ? 'bg-violet-400 animate-pulse' :
          renderState.status === 'completed' ? 'bg-emerald-400' :
          renderState.status === 'error' ? 'bg-red-400' :
          'bg-zinc-600'
        }`} />
        <span className={ffmpegStatus.color}>{ffmpegStatus.text}</span>
      </span>

      {/* Version */}
      <span className="text-zinc-600">SunoCraft v1.0</span>
    </div>
  );
}
