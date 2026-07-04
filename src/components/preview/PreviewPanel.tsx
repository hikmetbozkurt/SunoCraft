import { useEditor } from '../../hooks/useEditor';
import { VideoPreview } from './VideoPreview';
import { AudioMeter } from './AudioMeter';
import { formatDuration } from '../../utils/fileHelpers';

interface PreviewPanelProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
}

export function PreviewPanel({ analyserRef }: PreviewPanelProps) {
  const { state, totalDuration } = useEditor();
  const { backgroundMedia, playback, tracks } = state;

  const hasContent = tracks.length > 0;

  return (
    <div className="h-full flex flex-col bg-zinc-900/30 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${playback.isPlaying ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Preview</h3>
        </div>
        {hasContent && (
          <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
            {formatDuration(playback.currentTime)} / {formatDuration(totalDuration)}
          </span>
        )}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        {!hasContent ? (
          /* Empty State */
          <div className="text-center space-y-2 p-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-white/[0.03] flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
            </div>
            <p className="text-[11px] text-zinc-600">Import tracks to preview</p>
          </div>
        ) : (
          /* Preview Content */
          <div className="w-full h-full flex">
            {/* Video / Image Preview */}
            <div className="flex-1 flex items-center justify-center bg-black/40 relative">
              {backgroundMedia ? (
                <VideoPreview media={backgroundMedia} isPlaying={playback.isPlaying} />
              ) : (
                /* Audio-only visualization */
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-end gap-1 h-16">
                    {Array.from({ length: 32 }).map((_, i) => {
                      const height = playback.isPlaying
                        ? 15 + Math.sin(Date.now() / 200 + i * 0.5) * 40 + Math.random() * 20
                        : 10 + Math.sin(i * 0.6) * 8;
                      return (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all duration-100 ${
                            playback.isPlaying ? 'bg-violet-500/60' : 'bg-zinc-700/40'
                          }`}
                          style={{ height: `${Math.max(4, height)}%` }}
                        />
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-600">Audio Only</p>
                </div>
              )}

              {/* Playback overlay */}
              {playback.isPlaying && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded px-2 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] text-white font-mono">{formatDuration(playback.currentTime)}</span>
                </div>
              )}
            </div>

            {/* Audio Meter */}
            <AudioMeter analyserRef={analyserRef} isPlaying={playback.isPlaying} />
          </div>
        )}
      </div>
    </div>
  );
}
