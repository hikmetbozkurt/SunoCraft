import { useRef, useState, useCallback } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { VideoPreview } from './VideoPreview';
import { AudioMeter } from './AudioMeter';
import { CompositionWaveform } from './CompositionWaveform';
import {
  formatDuration,
  formatFileSize,
  generateId,
  getMediaType,
  getAudioDuration,
} from '../../utils/fileHelpers';
import { TRACK_COLORS } from '../../types';
import type { AudioTrack, BackgroundMedia } from '../../types';

interface PreviewPanelProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  onSeek: (time: number) => void;
}

export function PreviewPanel({ analyserRef, onSeek }: PreviewPanelProps) {
  const {
    state,
    sortedTracks,
    totalDuration,
    addTracks,
    removeTrack,
    reorderTracks,
    setTrackVolume,
    toggleMute,
    toggleSolo,
    setActiveTrack,
    setBackground,
  } = useEditor();

  const { backgroundMedia, playback } = state;
  const hasContent = sortedTracks.length > 0 || backgroundMedia !== null;

  // File input refs for quick interactions in the upper panel
  const addSongInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const replaceTrackInputRef = useRef<HTMLInputElement>(null);

  // Keep track of which track is being replaced
  const [replacingTrackId, setReplacingTrackId] = useState<string | null>(null);

  // Playback control event dispatchers
  const togglePlayPause = () => {
    document.dispatchEvent(new CustomEvent('sunocraft:playpause'));
  };

  const handleStop = () => {
    document.dispatchEvent(new CustomEvent('sunocraft:stop'));
  };

  const handleLoopToggle = () => {
    const nextLoopState = !playback.isLooping;
    document.dispatchEvent(new CustomEvent('sunocraft:seek', { detail: playback.currentTime }));
    // update state
    state.playback.isLooping = nextLoopState;
    // Dispatch set playback
    document.dispatchEvent(
      new CustomEvent('sunocraft:setplayback', { detail: { isLooping: nextLoopState } })
    );
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const speed = parseFloat(e.target.value);
    document.dispatchEvent(
      new CustomEvent('sunocraft:setplayback', { detail: { playbackSpeed: speed } })
    );
  };

  // Reorder tracks sequentially
  const moveTrack = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= sortedTracks.length) return;

      const newTracks = [...sortedTracks];
      const [moved] = newTracks.splice(index, 1);
      newTracks.splice(nextIndex, 0, moved);
      reorderTracks(newTracks);
    },
    [sortedTracks, reorderTracks]
  );

  // Add tracks from file picker
  const handleAddTracks = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const newTracks: AudioTrack[] = [];

    for (const file of files) {
      try {
        const duration = await getAudioDuration(file);
        newTracks.push({
          id: generateId(),
          name: file.name,
          file,
          duration,
          trimStart: 0,
          trimEnd: duration,
          order: 0, // Set by reducer
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
          color: TRACK_COLORS[(sortedTracks.length + newTracks.length) % TRACK_COLORS.length],
        });
      } catch (err) {
        console.error('Failed to parse duration for file:', file.name, err);
      }
    }

    if (newTracks.length > 0) {
      addTracks(newTracks);
    }
    e.target.value = '';
  };

  // Replace background media
  const handleBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (backgroundMedia) {
      URL.revokeObjectURL(backgroundMedia.previewUrl);
    }
    const bg: BackgroundMedia = {
      file,
      type: getMediaType(file.name),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    };
    setBackground(bg);
    e.target.value = '';
  };

  // Replace file content of a specific track
  const handleReplaceTrack = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !replacingTrackId) return;
    const file = e.target.files[0];

    try {
      const duration = await getAudioDuration(file);
      const updatedTracks = sortedTracks.map((t) => {
        if (t.id === replacingTrackId) {
          URL.revokeObjectURL(t.previewUrl);
          return {
            ...t,
            name: file.name,
            file,
            duration,
            trimStart: 0,
            trimEnd: duration,
            size: file.size,
            previewUrl: URL.createObjectURL(file),
          };
        }
        return t;
      });
      reorderTracks(updatedTracks);
    } catch (err) {
      console.error('Error replacing track file:', err);
    } finally {
      setReplacingTrackId(null);
      e.target.value = '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Header Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-0.5 rounded border border-white/[0.04]">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                playback.isPlaying ? 'bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/55' : 'bg-zinc-600'
              }`}
            />
            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">
              {playback.isPlaying ? 'PLAYING' : 'PAUSED'}
            </span>
          </div>
          <h3 className="text-xs text-zinc-300 font-semibold uppercase tracking-wider">
            Studio Arranger & Preview Monitor
          </h3>
        </div>
        {hasContent && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono">
              Clips: <span className="text-zinc-300">{sortedTracks.length}</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">|</span>
            <span className="text-xs font-mono text-cyan-400 font-semibold tabular-nums">
              {formatDuration(playback.currentTime)} / {formatDuration(totalDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex min-h-0 divide-x divide-white/[0.06] bg-zinc-900/10">
        {/* Left Section: Visual Monitor Box */}
        <div className="w-[55%] flex flex-col justify-between p-3 min-w-0">
          <div className="flex-1 flex items-center justify-center bg-black/60 rounded-xl border border-white/[0.04] relative overflow-hidden shadow-inner group">
            {backgroundMedia ? (
              <VideoPreview
                media={backgroundMedia}
                isPlaying={playback.isPlaying}
                currentTime={playback.currentTime}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 font-medium">Audio Only Preview</p>
                  <p className="text-[9px] text-zinc-600 mt-0.5">Add background media to export MP4</p>
                </div>
              </div>
            )}

            {/* Playback time overlay on monitor */}
            {playback.isPlaying && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-md rounded px-2 py-0.5 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] text-cyan-300 font-mono">{formatDuration(playback.currentTime)}</span>
              </div>
            )}

            {/* Audio level meter overlay right-aligned inside the monitor */}
            <div className="absolute right-0 top-0 bottom-0">
              <AudioMeter analyserRef={analyserRef} isPlaying={playback.isPlaying} />
            </div>
          </div>

          {/* Quick Playback Bar */}
          <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                disabled={sortedTracks.length === 0}
                className="w-8 h-8 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Play / Pause"
              >
                {playback.isPlaying ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              {/* Stop */}
              <button
                onClick={handleStop}
                disabled={sortedTracks.length === 0}
                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Stop"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
              </button>

              {/* Loop */}
              <button
                onClick={handleLoopToggle}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                  playback.isLooping
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle Loop"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.656 48.656 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7C4.547 9.547 4.5 10.768 4.5 12s.047 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.092-1.209.138-2.43.138-3.662z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5l3 3 3-3" />
                </svg>
              </button>
            </div>

            {/* Playback Settings */}
            <div className="flex items-center gap-3">
              {/* Playback speed */}
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-zinc-500 uppercase font-semibold">Speed</span>
                <select
                  value={playback.playbackSpeed}
                  onChange={handleSpeedChange}
                  className="bg-zinc-900 border border-white/[0.08] text-zinc-300 text-[10px] rounded px-1.5 py-1 focus:outline-none focus:border-cyan-500"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1">1.0x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x</option>
                </select>
              </div>

              {/* Master Volume Indicator */}
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <div className="w-14 h-1.5 bg-white/[0.06] rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-cyan-500/80 rounded-full"
                    style={{ width: `${playback.masterVolume * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Arrangement Deck & Clip Mixer */}
        <div className="w-[45%] flex flex-col min-w-0 bg-zinc-950/40">
          <div className="p-3 border-b border-white/[0.04] bg-zinc-900/35 flex-shrink-0 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Composition Arranger
            </span>
            <button
              onClick={() => addSongInputRef.current?.click()}
              className="text-[9px] text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-0.5 rounded border border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/5 transition-all"
            >
              + Add Song
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {/* Visual Background Media Box */}
            <div className="bg-zinc-900/40 border border-white/[0.04] rounded-lg p-2.5 space-y-2">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                Background Media (Video / Image)
              </span>

              {backgroundMedia ? (
                <div className="flex items-center gap-2.5 bg-zinc-950/60 p-2 rounded border border-white/[0.02]">
                  {backgroundMedia.type === 'image' || backgroundMedia.type === 'gif' ? (
                    <img
                      src={backgroundMedia.previewUrl}
                      alt="bg preview"
                      className="w-12 h-8 rounded object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-12 h-8 rounded bg-zinc-800 flex items-center justify-center border border-white/10 text-cyan-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-300 font-medium truncate">{backgroundMedia.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase">
                      {backgroundMedia.type}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="p-1 rounded bg-white/[0.02] border border-white/[0.06] text-zinc-400 hover:text-cyan-400 transition-colors"
                      title="Replace background media"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17.79" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setBackground(null)}
                      className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Remove background"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => bgInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center py-4 border border-dashed border-white/10 rounded-lg hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.03] transition-all gap-1.5"
                >
                  <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-[10px] text-zinc-500 font-semibold">Add Background Media</span>
                </button>
              )}
            </div>

            {/* Audio Playlist Mixer Slot */}
            <div className="space-y-2">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                Audio Track Chain (Concat List)
              </span>

              {sortedTracks.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/5 rounded-lg bg-zinc-900/10">
                  <p className="text-[10px] text-zinc-500">No audio tracks added to composition.</p>
                  <button
                    onClick={() => addSongInputRef.current?.click()}
                    className="text-[9px] text-cyan-400 font-semibold mt-2 hover:underline"
                  >
                    Import Audio Files
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sortedTracks.map((track, idx) => {
                    const isActive = state.activeTrackId === track.id;
                    const durationText = formatDuration(track.trimEnd - track.trimStart);

                    return (
                      <div
                        key={track.id}
                        onClick={() => setActiveTrack(track.id)}
                        className={`group relative flex flex-col p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/[0.03] border-cyan-500/30'
                            : 'bg-zinc-900/25 border-white/[0.04] hover:bg-zinc-900/50'
                        }`}
                      >
                        {/* Track Info Row */}
                        <div className="flex items-center gap-2">
                          {/* Color stripe */}
                          <div
                            className="w-1 h-6 rounded flex-shrink-0"
                            style={{ backgroundColor: track.color }}
                          />

                          {/* Index Badge */}
                          <span className="text-[9px] font-mono text-zinc-500 w-4">
                            #{idx + 1}
                          </span>

                          {/* Track Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-zinc-300 truncate">
                              {track.name}
                            </p>
                            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                              {durationText}
                              {track.trimStart > 0 || track.trimEnd < track.duration ? ' (Trimmed)' : ''}
                            </p>
                          </div>

                          {/* Quick sorting arrows */}
                          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              disabled={idx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTrack(idx, 'up');
                              }}
                              className="w-4 h-4 flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded disabled:opacity-20 transition-all"
                            >
                              ▲
                            </button>
                            <button
                              disabled={idx === sortedTracks.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTrack(idx, 'down');
                              }}
                              className="w-4 h-4 flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded disabled:opacity-20 transition-all"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        {/* Track Volume slider & settings row */}
                        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-white/[0.03] pt-2">
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-[8px] font-semibold text-zinc-500 uppercase">Vol</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={track.volume}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setTrackVolume(track.id, parseFloat(e.target.value));
                              }}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">
                              {Math.round(track.volume * 100)}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMute(track.id);
                              }}
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all ${
                                track.muted
                                  ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              M
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSolo(track.id);
                              }}
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-all ${
                                track.solo
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              S
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplacingTrackId(track.id);
                                replaceTrackInputRef.current?.click();
                              }}
                              className="p-1 rounded bg-white/[0.02] border border-white/[0.06] text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                              title="Replace audio file"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTrack(track.id);
                              }}
                              className="p-1 rounded bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-all"
                              title="Remove track"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Timeline Waveform & Scrubber */}
      <div className="p-3 border-t border-white/[0.06] bg-zinc-950 flex-shrink-0">
        <CompositionWaveform onSeek={onSeek} />
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={addSongInputRef}
        type="file"
        multiple
        accept="audio/*"
        onChange={handleAddTracks}
        className="hidden"
      />
      <input
        ref={bgInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleBgSelect}
        className="hidden"
      />
      <input
        ref={replaceTrackInputRef}
        type="file"
        accept="audio/*"
        onChange={handleReplaceTrack}
        className="hidden"
      />
    </div>
  );
}

