import { useCallback, useRef } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import { Button } from '../shared/Button';
import { ProgressBar } from '../shared/ProgressBar';
import type { OutputFormat, BackgroundMedia } from '../../types';
import { TRACK_COLORS } from '../../types';
import { getMediaType, formatDuration, formatFileSize } from '../../utils/fileHelpers';

const FORMAT_OPTIONS: { value: OutputFormat; label: string; desc: string }[] = [
  { value: '.mp4', label: 'MP4', desc: 'Video' },
  { value: '.mp3', label: 'MP3', desc: 'Audio' },
  { value: '.wav', label: 'WAV', desc: 'Lossless' },
];

export function PropertiesPanel() {
  const {
    state, activeTrack, totalDuration,
    setFormat, setBackground, setTrackVolume, setTrackGain, setTrackPan,
    setTrackFade, toggleMute, toggleSolo, toggleLock, setTrackColor,
    renameTrack,
  } = useEditor();
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
    if (backgroundMedia) URL.revokeObjectURL(backgroundMedia.previewUrl);
    setBackground(null);
  }, [backgroundMedia, setBackground]);

  const handleRender = useCallback(async () => {
    if (!loaded) { await load(); return; }
    await render();
  }, [loaded, load, render]);

  const canRender = state.tracks.length > 0 && !isProcessing;

  return (
    <div className="h-full flex flex-col bg-zinc-950/40 select-none">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/[0.04]">
        <h2 className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
          {activeTrack ? 'Track Properties' : 'Project'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 space-y-4">
          {/* ── Track Properties (when a track is selected) ──── */}
          {activeTrack && (
            <>
              {/* Track Name */}
              <Section title="Name">
                <input
                  type="text"
                  value={activeTrack.name}
                  onChange={(e) => renameTrack(activeTrack.id, e.target.value)}
                  className="w-full px-2 py-1.5 text-[11px] bg-white/[0.03] border border-white/[0.06] rounded-md text-zinc-200 focus:outline-none focus:border-violet-500/40"
                />
              </Section>

              {/* Color */}
              <Section title="Color">
                <div className="flex gap-1.5">
                  {TRACK_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setTrackColor(activeTrack.id, c)}
                      className={`w-5 h-5 rounded-full transition-all ${
                        activeTrack.color === c ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-zinc-900 scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </Section>

              {/* Duration */}
              <Section title="Duration">
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500 text-[10px]">Start</span>
                    <p className="text-zinc-300 font-mono">{formatDuration(activeTrack.trimStart)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px]">End</span>
                    <p className="text-zinc-300 font-mono">{formatDuration(activeTrack.trimEnd)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px]">Length</span>
                    <p className="text-zinc-300 font-mono">{formatDuration(activeTrack.trimEnd - activeTrack.trimStart)}</p>
                  </div>
                </div>
              </Section>

              {/* Volume */}
              <Section title="Volume">
                <SliderControl
                  value={activeTrack.volume}
                  min={0} max={1} step={0.01}
                  onChange={(v) => setTrackVolume(activeTrack.id, v)}
                  displayValue={`${Math.round(activeTrack.volume * 100)}%`}
                />
              </Section>

              {/* Gain */}
              <Section title="Gain (dB)">
                <SliderControl
                  value={activeTrack.gain}
                  min={-20} max={20} step={0.5}
                  onChange={(v) => setTrackGain(activeTrack.id, v)}
                  displayValue={`${activeTrack.gain > 0 ? '+' : ''}${activeTrack.gain.toFixed(1)} dB`}
                />
              </Section>

              {/* Pan */}
              <Section title="Pan">
                <SliderControl
                  value={activeTrack.pan}
                  min={-1} max={1} step={0.01}
                  onChange={(v) => setTrackPan(activeTrack.id, v)}
                  displayValue={activeTrack.pan === 0 ? 'C' : activeTrack.pan < 0 ? `L${Math.round(Math.abs(activeTrack.pan) * 100)}` : `R${Math.round(activeTrack.pan * 100)}`}
                />
              </Section>

              {/* Fade In / Out */}
              <Section title="Fade">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 mb-1 block">In</span>
                    <SliderControl
                      value={activeTrack.fadeIn}
                      min={0} max={10} step={0.1}
                      onChange={(v) => setTrackFade(activeTrack.id, v, activeTrack.fadeOut)}
                      displayValue={`${activeTrack.fadeIn.toFixed(1)}s`}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 mb-1 block">Out</span>
                    <SliderControl
                      value={activeTrack.fadeOut}
                      min={0} max={10} step={0.1}
                      onChange={(v) => setTrackFade(activeTrack.id, activeTrack.fadeIn, v)}
                      displayValue={`${activeTrack.fadeOut.toFixed(1)}s`}
                    />
                  </div>
                </div>
              </Section>

              {/* Quick toggles */}
              <Section title="Controls">
                <div className="flex gap-1.5">
                  <ToggleButton
                    active={activeTrack.muted}
                    onClick={() => toggleMute(activeTrack.id)}
                    label="Mute"
                    activeColor="bg-red-500/15 text-red-400 border-red-500/30"
                  />
                  <ToggleButton
                    active={activeTrack.solo}
                    onClick={() => toggleSolo(activeTrack.id)}
                    label="Solo"
                    activeColor="bg-amber-500/15 text-amber-400 border-amber-500/30"
                  />
                  <ToggleButton
                    active={activeTrack.locked}
                    onClick={() => toggleLock(activeTrack.id)}
                    label="Lock"
                    activeColor="bg-blue-500/15 text-blue-400 border-blue-500/30"
                  />
                </div>
              </Section>

              {/* File Info */}
              <Section title="File">
                <div className="text-[11px] text-zinc-500 space-y-0.5">
                  <p>Size: <span className="text-zinc-400">{formatFileSize(activeTrack.size)}</span></p>
                  <p>Full duration: <span className="text-zinc-400 font-mono">{formatDuration(activeTrack.duration)}</span></p>
                </div>
              </Section>
            </>
          )}

          {/* ── Project settings (always visible) ──────────── */}
          <div className={activeTrack ? 'border-t border-white/[0.04] pt-4' : ''}>
            {/* Output Format */}
            <Section title="Output Format">
              <div className="flex gap-1">
                {FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                      outputFormat === opt.value
                        ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                        : 'bg-white/[0.02] border-white/[0.04] text-zinc-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    {opt.label}
                    <span className="block text-[9px] text-zinc-500 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Background Media (for MP4) */}
            {outputFormat === '.mp4' && (
              <Section title="Background">
                {backgroundMedia ? (
                  <div className="relative group rounded-lg overflow-hidden border border-white/[0.06]">
                    <img src={backgroundMedia.previewUrl} alt={backgroundMedia.name} className="w-full h-24 object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={handleRemoveBg}
                        className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 text-[11px] hover:bg-red-500/30"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60">
                      <span className="text-[10px] text-zinc-300 truncate block">{backgroundMedia.name}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => bgInputRef.current?.click()}
                    className="w-full border border-dashed border-white/10 hover:border-white/20 rounded-lg p-4 flex flex-col items-center gap-1.5 transition-all text-zinc-500 hover:text-zinc-400 hover:bg-white/[0.02]"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <span className="text-[10px]">Add Background</span>
                  </button>
                )}
                <input ref={bgInputRef} type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm" onChange={handleBgSelect} className="hidden" />
              </Section>
            )}

            {/* Summary */}
            {state.tracks.length > 0 && (
              <Section title="Summary">
                <div className="text-[11px] text-zinc-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Tracks</span>
                    <span className="text-zinc-300">{state.tracks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span className="text-zinc-300 font-mono">{formatDuration(totalDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format</span>
                    <span className="text-zinc-300">{outputFormat.toUpperCase().replace('.', '')}</span>
                  </div>
                </div>
              </Section>
            )}
          </div>

          {/* Render Status */}
          {(isProcessing || isCompleted || isError) && (
            <div className="space-y-2">
              {isProcessing && (
                <ProgressBar
                  progress={renderState.progress}
                  label={renderState.status === 'loading-ffmpeg' ? 'Loading FFmpeg…' : 'Processing…'}
                  size="sm"
                />
              )}
              {isCompleted && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center space-y-2">
                  <p className="text-[11px] text-emerald-400 font-medium">Export Complete ✓</p>
                  <Button variant="primary" size="sm" onClick={downloadOutput}>Download</Button>
                </div>
              )}
              {isError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  <p className="text-[10px] text-red-400">{renderState.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Render Button (sticky bottom) */}
      <div className="p-3 border-t border-white/[0.04]">
        {!loaded && !loading && (
          <Button variant="secondary" size="sm" className="w-full mb-1.5" onClick={load}>
            Load FFmpeg
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleRender}
          disabled={!canRender}
          loading={isProcessing}
        >
          {isProcessing ? 'Processing…' : outputFormat === '.mp4' ? 'Export Video' : 'Export Audio'}
        </Button>
      </div>
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{title}</h4>
      {children}
    </div>
  );
}

function SliderControl({
  value, min, max, step, onChange, displayValue,
}: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; displayValue: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
          [&::-webkit-slider-thumb]:bg-zinc-300 [&::-webkit-slider-thumb]:rounded-full"
      />
      <span className="text-[10px] text-zinc-400 font-mono w-10 text-right">{displayValue}</span>
    </div>
  );
}

function ToggleButton({
  active, onClick, label, activeColor,
}: {
  active: boolean; onClick: () => void; label: string; activeColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1 rounded-md text-[10px] font-medium border transition-all ${
        active ? activeColor : 'bg-white/[0.02] border-white/[0.04] text-zinc-500 hover:bg-white/[0.04]'
      }`}
    >
      {label}
    </button>
  );
}
