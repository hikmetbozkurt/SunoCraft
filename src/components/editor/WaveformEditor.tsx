import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useEditor } from '../../hooks/useEditor';
import { formatDuration, generateId } from '../../utils/fileHelpers';

export function WaveformEditor() {
  const { activeTrack, updateTrim, splitTrack } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionsPluginRef = useRef<any>(null);
  const activeRegionRef = useRef<Region | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean; x: number; y: number; timeAtCursor: number;
  }>({ visible: false, x: 0, y: 0, timeAtCursor: 0 });

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !activeTrack) return;

    setIsPlaying(false);
    setCurrentTime(activeTrack.trimStart);

    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: activeTrack.previewUrl,
      waveColor: `${activeTrack.color}66`,
      progressColor: activeTrack.color,
      cursorColor: 'rgb(6, 182, 212)',
      cursorWidth: 2,
      height: 80,
      barWidth: 2,
      barGap: 2,
      barRadius: 3,
      normalize: true,
      minPxPerSec: zoom,
      fillParent: true,
      plugins: [regionsPlugin],
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setDuration(ws.getDuration());
      ws.setTime(activeTrack.trimStart);
      const region = regionsPlugin.addRegion({
        id: 'trim-region',
        start: activeTrack.trimStart,
        end: activeTrack.trimEnd,
        color: 'rgba(6, 182, 212, 0.12)',
        drag: true,
        resize: true,
      });
      activeRegionRef.current = region;
    });

    ws.on('audioprocess', (time) => {
      setCurrentTime(time);
      if (activeRegionRef.current) {
        const { end } = activeRegionRef.current;
        if (time >= end) {
          ws.pause();
          ws.setTime(activeRegionRef.current.start);
        }
      }
    });

    ws.on('interaction', (time) => setCurrentTime(time));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    regionsPlugin.on('region-updated', (region: Region) => {
      if (region.id === 'trim-region') {
        updateTrim(activeTrack.id, region.start, region.end);
      }
    });

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
      activeRegionRef.current = null;
    };
  }, [activeTrack?.id, activeTrack?.previewUrl]);

  useEffect(() => {
    const ws = wavesurferRef.current;
    if (ws) {
      try {
        if (ws.getDuration() > 0) {
          ws.zoom(zoom);
        }
      } catch (err) {
        console.debug("WaveSurfer zoom deferred until audio is loaded:", err);
      }
    }
  }, [zoom]);

  const togglePlay = useCallback(() => {
    if (wavesurferRef.current) wavesurferRef.current.playPause();
  }, []);

  const stopPlayback = useCallback(() => {
    if (wavesurferRef.current && activeRegionRef.current) {
      wavesurferRef.current.pause();
      wavesurferRef.current.setTime(activeRegionRef.current.start);
      setCurrentTime(activeRegionRef.current.start);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (wavesurferRef.current) {
      const muted = !isMuted;
      wavesurferRef.current.setMuted(muted);
      setIsMuted(muted);
    }
  }, [isMuted]);

  const playSelection = useCallback(() => {
    const ws = wavesurferRef.current;
    const region = activeRegionRef.current;
    if (ws && region) { ws.setTime(region.start); ws.play(); }
  }, []);

  const resetTrimRegion = useCallback(() => {
    const ws = wavesurferRef.current;
    const region = activeRegionRef.current;
    if (ws && region) {
      const fullDur = ws.getDuration();
      region.setOptions({ start: 0, end: fullDur });
      updateTrim(activeTrack!.id, 0, fullDur);
      ws.setTime(0);
    }
  }, [activeTrack, updateTrim]);

  const handleSplitTrack = useCallback(() => {
    if (!activeTrack) return;
    const splitTime = contextMenu.timeAtCursor;
    if (splitTime <= activeTrack.trimStart || splitTime >= activeTrack.trimEnd) return;
    const firstId = activeTrack.id;
    const secondId = generateId();
    splitTrack(activeTrack.id, splitTime, firstId, secondId);
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [activeTrack, contextMenu.timeAtCursor, splitTrack]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    const ws = wavesurferRef.current;
    if (!container || !ws) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const fullDur = ws.getDuration();
    const scrollLeft = container.scrollLeft || 0;
    const timeAtCursor = ((clickX + scrollLeft) / (width * (zoom / 10))) * fullDur;
    const clampedTime = Math.max(0, Math.min(fullDur, timeAtCursor));

    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, timeAtCursor: clampedTime });
  }, [zoom]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  if (!activeTrack) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900/20">
        <p className="text-[11px] text-zinc-600">Select a track to edit waveform</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/20 relative select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] flex-shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeTrack.color }} />
          <h3 className="text-[11px] font-medium text-zinc-300 truncate">{activeTrack.name}</h3>
          <span className="text-[10px] text-zinc-600">Waveform</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={resetTrimRegion} className="px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] rounded transition-all">
            Reset
          </button>
          <button onClick={playSelection} className="px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] rounded transition-all">
            Play Sel.
          </button>
        </div>
      </div>

      {/* Waveform */}
      <div className="flex-1 relative px-3 py-2 min-h-0">
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar cursor-pointer rounded-lg bg-black/20 border border-white/[0.03]"
        />
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.04] flex-shrink-0">
        {/* Playback */}
        <div className="flex items-center gap-1">
          <button onClick={togglePlay} className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-all">
            {isPlaying ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <button onClick={stopPlayback} className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-all">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
          </button>
          <button onClick={toggleMute} className={`w-6 h-6 flex items-center justify-center rounded transition-all ${isMuted ? 'text-red-400 bg-red-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isMuted ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H2.25A.75.75 0 001.5 9.75v4.5c0 .414.336.75.75.75h2.25l4.5 4.5V4.5z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              )}
            </svg>
          </button>
        </div>

        {/* Time */}
        <div className="text-[10px] text-zinc-400 font-mono tabular-nums">
          <span className="text-zinc-200">{formatDuration(currentTime)}</span>
          <span className="text-zinc-600 mx-1">/</span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-zinc-600 uppercase">Zoom</span>
          <input
            type="range" min="10" max="150" value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-16 h-0.5 bg-white/[0.08] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
              [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-zinc-900/95 border border-white/10 rounded-lg shadow-xl py-1 min-w-[130px] backdrop-blur-xl"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleSplitTrack} className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-200 hover:bg-violet-500/20 hover:text-violet-200 transition-colors flex items-center gap-2">
            <span className="text-zinc-500">✂</span> Split Here
          </button>
          <button onClick={playSelection} className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-200 hover:bg-violet-500/20 hover:text-violet-200 transition-colors flex items-center gap-2">
            <span className="text-zinc-500">▶</span> Play Selection
          </button>
          <div className="h-px bg-white/[0.06] my-0.5" />
          <button onClick={resetTrimRegion} className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-400 hover:bg-red-500/15 hover:text-red-300 transition-colors flex items-center gap-2">
            <span className="text-zinc-500">↺</span> Reset Selection
          </button>
        </div>
      )}
    </div>
  );
}
