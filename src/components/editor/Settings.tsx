import { useCallback, useRef } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { Button } from '../shared/Button';
import { ProgressBar } from '../shared/ProgressBar';
import type { OutputFormat, BackgroundMedia } from '../../types';
import { getMediaType } from '../../utils/fileHelpers';
import { formatDuration } from '../../utils/fileHelpers';

const FORMAT_OPTIONS: { value: OutputFormat; label: string; icon: string }[] = [
  { value: '.mp4', label: 'MP4 Video', icon: '🎬' },
  { value: '.mp3', label: 'MP3 Ses', icon: '🎵' },
  { value: '.wav', label: 'WAV Ses', icon: '🎧' },
];

export function Settings() {
  const { state, setFormat, setBackground, canRender, totalDuration } = useEditor();
  const { loaded, loading, load, render, downloadOutput } = useFFmpeg();
  const bgInputRef = useRef<HTMLInputElement>(null);

  const { outputFormat, backgroundMedia, renderState } = state;
  const isProcessing = renderState.status === 'processing' || renderState.status === 'loading-ffmpeg';
  const isCompleted = renderState.status === 'completed';
  const isError = renderState.status === 'error';

  const handleBgSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const bg: BackgroundMedia = {
        file,
        type: getMediaType(file.name),
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      };
      setBackground(bg);
    },
    [setBackground]
  );

  const handleRemoveBg = useCallback(() => {
    if (backgroundMedia) {
      URL.revokeObjectURL(backgroundMedia.previewUrl);
    }
    setBackground(null);
  }, [backgroundMedia, setBackground]);

  const handleRender = useCallback(async () => {
    if (!loaded) {
      await load();
      // After load, user needs to click again
      return;
    }
    await render();
  }, [loaded, load, render]);

  const statusMessage = (() => {
    switch (renderState.status) {
      case 'loading-ffmpeg':
        return 'FFmpeg motoru yükleniyor...';
      case 'processing':
        return 'İşleniyor...';
      case 'completed':
        return 'Tamamlandı! ✨';
      case 'error':
        return renderState.error || 'Bir hata oluştu';
      default:
        return null;
    }
  })();

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-6">
        {/* Section: Output Format */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Çıktı Formatı
          </h3>
          <div className="space-y-1.5">
            {FORMAT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`
                  flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200
                  ${
                    outputFormat === opt.value
                      ? 'bg-violet-500/10 border border-violet-500/30'
                      : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]'
                  }
                `}
              >
                <input
                  type="radio"
                  name="format"
                  value={opt.value}
                  checked={outputFormat === opt.value}
                  onChange={() => setFormat(opt.value)}
                  className="hidden"
                />
                <span className="text-base">{opt.icon}</span>
                <span
                  className={`text-sm font-medium ${
                    outputFormat === opt.value ? 'text-violet-300' : 'text-zinc-400'
                  }`}
                >
                  {opt.label}
                </span>
                <span className="text-[11px] text-zinc-600 ml-auto">{opt.value}</span>
                {outputFormat === opt.value && (
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Section: Background Media (only for mp4) */}
        {outputFormat === '.mp4' && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Arka Plan Görseli
            </h3>
            {backgroundMedia ? (
              <div className="relative group rounded-xl overflow-hidden border border-white/[0.06]">
                <img
                  src={backgroundMedia.previewUrl}
                  alt={backgroundMedia.name}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[11px] text-zinc-300 truncate">{backgroundMedia.name}</span>
                  <button
                    onClick={handleRemoveBg}
                    className="p-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-6 flex flex-col items-center gap-2 transition-all duration-200 hover:bg-white/[0.02]"
              >
                <div className="p-2 rounded-lg bg-white/5 text-zinc-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <span className="text-xs text-zinc-500">Görsel ekle (PNG, JPG, GIF)</span>
              </button>
            )}
            <input
              ref={bgInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp"
              onChange={handleBgSelect}
              className="hidden"
            />
            {outputFormat === '.mp4' && !backgroundMedia && (
              <p className="text-[10px] text-amber-400/60 mt-2">
                ⚠ MP4 çıktısı için arka plan görseli önerilir
              </p>
            )}
          </div>
        )}

        {/* Section: Summary */}
        {state.tracks.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Özet
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Parça sayısı</span>
                <span className="text-zinc-300 font-semibold">{state.tracks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Toplam süre</span>
                <span className="text-zinc-300 font-mono font-semibold">
                  {formatDuration(totalDuration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Format</span>
                <span className="text-zinc-300 font-semibold">{outputFormat}</span>
              </div>
              {backgroundMedia && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Arka plan</span>
                  <span className="text-zinc-300 truncate ml-2">{backgroundMedia.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Render Status */}
        {(isProcessing || isCompleted || isError) && (
          <div className="space-y-3">
            {(isProcessing || renderState.status === 'loading-ffmpeg') && (
              <ProgressBar
                progress={renderState.progress}
                label={statusMessage || undefined}
                size="md"
              />
            )}
            {isCompleted && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center space-y-3 animate-fade-in">
                <div className="text-2xl">🎉</div>
                <p className="text-sm text-emerald-400 font-medium">{statusMessage}</p>
                <Button variant="primary" size="md" onClick={downloadOutput}>
                  ⬇ İndir
                </Button>
              </div>
            )}
            {isError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-400">{renderState.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render Button (sticky bottom) */}
      <div className="mt-auto p-4 border-t border-white/[0.04]">
        {!loaded && !loading && (
          <Button
            variant="secondary"
            size="md"
            className="w-full mb-2"
            onClick={load}
          >
            🔧 FFmpeg Motorunu Yükle
          </Button>
        )}
        {loading && (
          <Button variant="secondary" size="md" className="w-full mb-2" loading disabled>
            FFmpeg Yükleniyor...
          </Button>
        )}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleRender}
          disabled={!canRender}
          loading={isProcessing}
          icon={
            !isProcessing ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
            ) : undefined
          }
        >
          {isProcessing ? 'İşleniyor...' : outputFormat === '.mp4' ? 'Videoyu Oluştur' : 'Sesi Oluştur'}
        </Button>
      </div>
    </div>
  );
}
