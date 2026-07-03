import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useEditor } from '../../hooks/useEditor';
import { formatDuration, generateId } from '../../utils/fileHelpers';
import { Button } from '../shared/Button';

export function WaveformEditor() {
  const { activeTrack, updateTrim, splitTrack } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);
  const activeRegionRef = useRef<Region | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    timeAtCursor: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    timeAtCursor: 0,
  });

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !activeTrack) return;

    // Reset local states
    setIsPlaying(false);
    setCurrentTime(activeTrack.trimStart);

    // Create Regions Plugin
    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    // Create WaveSurfer Instance
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: activeTrack.previewUrl,
      waveColor: 'rgba(168, 85, 247, 0.4)', // semi-transparent purple
      progressColor: 'rgb(168, 85, 247)',    // solid purple
      cursorColor: 'rgb(6, 182, 212)',      // cyan cursor
      cursorWidth: 2,
      height: 120,
      barWidth: 2,
      barGap: 3,
      barRadius: 4,
      normalize: true,
      minPxPerSec: zoom,
      fillParent: true,
      plugins: [regionsPlugin],
    });

    wavesurferRef.current = ws;

    // Listen to events
    ws.on('ready', () => {
      setDuration(ws.getDuration());
      ws.setTime(activeTrack.trimStart);

      // Create Trim Region
      const region = regionsPlugin.addRegion({
        id: 'trim-region',
        start: activeTrack.trimStart,
        end: activeTrack.trimEnd,
        color: 'rgba(6, 182, 212, 0.15)', // light cyan fill
        drag: true,
        resize: true,
      });

      activeRegionRef.current = region;
    });

    ws.on('audioprocess', (time) => {
      setCurrentTime(time);
      // Auto-loop or stop at trimEnd if playing selection
      if (activeRegionRef.current) {
        const { end } = activeRegionRef.current;
        if (time >= end) {
          ws.pause();
          ws.setTime(activeRegionRef.current.start);
        }
      }
    });

    ws.on('interaction', (time) => {
      setCurrentTime(time);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    // Handle Region Drag & Resize
    regionsPlugin.on('region-updated', (region) => {
      if (region.id === 'trim-region') {
        updateTrim(activeTrack.id, region.start, region.end);
      }
    });

    // Clean up
    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      regionsPluginRef.current = null;
      activeRegionRef.current = null;
    };
  }, [activeTrack?.id, activeTrack?.previewUrl]);

  // Adjust Zoom
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(zoom);
    }
  }, [zoom]);

  // Toggle Play
  const togglePlay = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  }, []);

  // Stop Playback
  const stopPlayback = useCallback(() => {
    if (wavesurferRef.current && activeRegionRef.current) {
      wavesurferRef.current.pause();
      wavesurferRef.current.setTime(activeRegionRef.current.start);
      setCurrentTime(activeRegionRef.current.start);
    }
  }, []);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (wavesurferRef.current) {
      const muted = !isMuted;
      wavesurferRef.current.setMuted(muted);
      setIsMuted(muted);
    }
  }, [isMuted]);

  // Play Active Selection Only
  const playSelection = useCallback(() => {
    const ws = wavesurferRef.current;
    const region = activeRegionRef.current;
    if (ws && region) {
      ws.setTime(region.start);
      ws.play();
    }
  }, []);

  // Reset Trim region to full length
  const resetTrimRegion = useCallback(() => {
    const ws = wavesurferRef.current;
    const region = activeRegionRef.current;
    if (ws && region) {
      const fullDur = ws.getDuration();
      region.setOptions({
        start: 0,
        end: fullDur,
      });
      updateTrim(activeTrack!.id, 0, fullDur);
      ws.setTime(0);
    }
  }, [activeTrack, updateTrim]);

  // Split Track Action
  const handleSplitTrack = useCallback(() => {
    if (!activeTrack) return;
    const splitTime = contextMenu.timeAtCursor;
    
    // Validate split boundary
    if (splitTime <= activeTrack.trimStart || splitTime >= activeTrack.trimEnd) {
      alert('Please perform the split operation inside the trimmed region.');
      return;
    }

    const firstId = activeTrack.id;
    const secondId = generateId();

    splitTrack(activeTrack.id, splitTime, firstId, secondId);
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [activeTrack, contextMenu.timeAtCursor, splitTrack]);

  // Handle Custom Context Menu Trigger
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    const ws = wavesurferRef.current;
    if (!container || !ws) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const fullDur = ws.getDuration();
    
    // Estimate time position based on click coordinates
    // When zoomed, we need to take scroll position into account
    const scrollLeft = container.scrollLeft || 0;
    const timeAtCursor = ((clickX + scrollLeft) / (width * (zoom / 10))) * fullDur;
    const clampedTime = Math.max(0, Math.min(fullDur, timeAtCursor));

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      timeAtCursor: clampedTime,
    });
  }, [zoom]);

  // Close context menu on document click
  useEffect(() => {
    const closeMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  if (!activeTrack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-900/40">
        <div className="text-zinc-500 text-center space-y-2">
          <svg className="w-12 h-12 mx-auto stroke-zinc-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          <p className="text-sm font-medium">Select a track to view the waveform</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-900/20 p-6 border-b border-white/[0.04] animate-fade-in relative select-none">
      {/* Title / Info */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-200 truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl" title={activeTrack.name}>
            {activeTrack.name}
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-1">
            Waveform Editor
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={resetTrimRegion}>
            Reset Selection
          </Button>
          <Button variant="secondary" size="sm" onClick={playSelection}>
            Play Selection
          </Button>
        </div>
      </div>

      {/* Waveform Wrapper */}
      <div className="relative bg-black/20 rounded-2xl border border-white/[0.04] p-4 group">
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar cursor-pointer relative"
          style={{ minHeight: '120px' }}
        />
        
        {/* Right Click Info Hint */}
        <div className="absolute top-2 right-2 text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
          💡 Right-click inside region to split track
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="w-10 h-10 p-0 rounded-xl"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            icon={
              isPlaying ? (
                <svg className="w-5 h-5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )
            }
          >
            {/* Removed text to prevent overflow */}
          </Button>
          <Button
            variant="secondary"
            className="w-10 h-10 p-0 rounded-xl"
            onClick={stopPlayback}
            title="Stop"
            icon={
              <svg className="w-5 h-5 text-zinc-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
            }
          >
            {/* Removed text to prevent overflow */}
          </Button>
          <Button
            variant="ghost"
            className="w-10 h-10 p-0 rounded-xl"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            icon={
              isMuted ? (
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H2.25A.75.75 0 001.5 9.75v4.5c0 .414.336.75.75.75h2.25l4.5 4.5V4.5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )
            }
          >
            {/* Removed text to prevent overflow */}
          </Button>
        </div>

        {/* Time display */}
        <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
          <span className="text-zinc-200 font-semibold">{formatDuration(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Zoom Control */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            Zoom
          </span>
          <input
            type="range"
            min="10"
            max="150"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-24 accent-violet-500 cursor-pointer bg-white/10 h-1 rounded-lg appearance-none"
          />
        </div>
      </div>

      {/* Floating Custom Right-Click Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-xl py-1.5 min-w-[140px] animate-fade-in"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleSplitTrack}
            className="w-full text-left px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-2"
          >
            ✂ Split Track Here
          </button>
          <button
            onClick={playSelection}
            className="w-full text-left px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-2"
          >
            ▶ Play Selection
          </button>
          <div className="h-px bg-white/5 my-1" />
          <button
            onClick={resetTrimRegion}
            className="w-full text-left px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
          >
            🔄 Reset Selection
          </button>
        </div>
      )}
    </div>
  );
}
