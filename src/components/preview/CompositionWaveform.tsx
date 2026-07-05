import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditor';
import { formatDuration, generateId, getAudioDuration } from '../../utils/fileHelpers';
import { TRACK_COLORS } from '../../types';
import type { AudioTrack } from '../../types';

interface CompositionWaveformProps {
  onSeek?: (time: number) => void;
}

export function CompositionWaveform({ onSeek }: CompositionWaveformProps) {
  const {
    state,
    sortedTracks,
    totalDuration,
    setActiveTrack,
    splitTrack,
    reorderTracks,
    removeTrack,
  } = useEditor();
  const { playback } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hover & Tooltip State
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [tooltipX, setTooltipX] = useState<number>(0);
  const [tooltipY, setTooltipY] = useState<number>(0);

  // Drag Selection Range State
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const dragStartRef = useRef<{ x: number; time: number } | null>(null);

  // File Inputs for Inline Scrubber Editing
  const replaceRangeInputRef = useRef<HTMLInputElement>(null);
  const replaceTrackInputRef = useRef<HTMLInputElement>(null);

  // React state for triggering UI re-renders
  const [buffers, setBuffers] = useState<Map<string, AudioBuffer>>(new Map());
  const [decoding, setDecoding] = useState<Set<string>>(new Set());

  // Refs for tracking synchronous decode progress and avoiding useEffect dependency loops
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const decodingRef = useRef<Set<string>>(new Set());

  // Synchronize refs with state when tracks are deleted
  useEffect(() => {
    let changed = false;
    for (const id of buffersRef.current.keys()) {
      if (!sortedTracks.some((t) => t.id === id)) {
        buffersRef.current.delete(id);
        changed = true;
      }
    }
    if (changed) {
      setBuffers(new Map(buffersRef.current));
    }
  }, [sortedTracks]);

  // Decode files in queue without dependency loops
  useEffect(() => {
    let active = true;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const decodeNext = async () => {
      for (const track of sortedTracks) {
        if (buffersRef.current.has(track.id) || decodingRef.current.has(track.id)) {
          continue;
        }

        // Mark as decoding
        decodingRef.current.add(track.id);
        setDecoding(new Set(decodingRef.current));

        try {
          const arrayBuffer = await track.file.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

          if (!active) return;

          buffersRef.current.set(track.id, audioBuffer);
          setBuffers(new Map(buffersRef.current));
        } catch (err) {
          console.error(`Error decoding audio track ${track.name}:`, err);
        } finally {
          if (active) {
            decodingRef.current.delete(track.id);
            setDecoding(new Set(decodingRef.current));
          }
        }
      }
    };

    decodeNext();

    return () => {
      active = false;
      ctx.close();
    };
  }, [sortedTracks]);

  // Redraw canvas on track, buffer, or playback time changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions dynamically scaled by device pixel ratio for retina screens
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (sortedTracks.length === 0 || totalDuration === 0) {
      // Draw flat timeline baseline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw track boundaries and waveforms
    let currentX = 0;
    const scale = width / totalDuration; // pixels per second

    sortedTracks.forEach((track, idx) => {
      const clipDuration = track.trimEnd - track.trimStart;
      const segmentWidth = clipDuration * scale;

      const startX = Math.round(currentX);
      const nextX = currentX + segmentWidth;
      const endX = Math.round(nextX);
      const segmentPx = endX - startX;

      const isActive = state.activeTrackId === track.id;

      // 1. Draw segment background and active glows
      if (isActive) {
        // Highlighting active segment background
        ctx.fillStyle = 'rgba(34, 211, 238, 0.04)';
        ctx.fillRect(startX, 0, segmentPx, height);

        // Top edge glow border for the active track
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(startX, 0, segmentPx, Math.round(3 * dpr));
      } else {
        ctx.fillStyle = track.muted ? 'rgba(255, 255, 255, 0.005)' : 'rgba(255, 255, 255, 0.025)';
        ctx.fillRect(startX, 0, segmentPx, height);
      }

      // 2. Draw segment divider lines
      ctx.strokeStyle = isActive ? 'rgba(34, 211, 238, 0.3)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = isActive ? Math.round(1.5 * dpr) : 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();

      const buffer = buffers.get(track.id);
      if (buffer) {
        // Draw real waveform peaks
        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;

        const startSample = Math.floor(track.trimStart * sampleRate);
        const endSample = Math.floor(track.trimEnd * sampleRate);
        const totalSamples = endSample - startSample;

        // Visual color is track color, faded if muted
        ctx.fillStyle = track.muted ? '#4b5563' : track.color;

        for (let i = 0; i < segmentPx; i++) {
          const pixelX = startX + i;

          // Map pixel offset to audio buffer sample chunks
          const chunkStart = startSample + Math.floor((i / segmentPx) * totalSamples);
          const chunkEnd = startSample + Math.floor(((i + 1) / segmentPx) * totalSamples);

          let maxVal = 0;
          const searchStep = Math.max(1, Math.floor((chunkEnd - chunkStart) / 60)); // Fast sampling

          for (let s = chunkStart; s < chunkEnd && s < channelData.length; s += searchStep) {
            const val = Math.abs(channelData[s]);
            if (val > maxVal) maxVal = val;
          }

          // Incorporate volume and gain scaling
          const gainLinear = Math.pow(10, track.gain / 20);
          const volumeFactor = track.volume * gainLinear;
          const finalAmplitude = Math.min(1, maxVal * volumeFactor);

          // Render symmetrical waveform peaks from center y-axis (leaving room for labels)
          const barHeight = Math.max(2 * dpr, finalAmplitude * (height - 18 * dpr));
          const y = (height - barHeight) / 2 + 4 * dpr;
          ctx.fillRect(pixelX, y, 1, barHeight);
        }

        // Draw track index and name badge
        ctx.fillStyle = isActive ? '#22d3ee' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = isActive
          ? `bold ${Math.round(8 * dpr)}px system-ui`
          : `${Math.round(8 * dpr)}px system-ui`;
        ctx.fillText(
          `#${idx + 1} ${track.name.replace(/\.[^/.]+$/, '').substring(0, 15)}`,
          startX + Math.round(6 * dpr),
          Math.round(14 * dpr)
        );
      } else {
        // Render loading state baseline
        ctx.strokeStyle = decoding.has(track.id) ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(startX, height / 2);
        ctx.lineTo(endX, height / 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = `${Math.round(8 * dpr)}px system-ui`;
        ctx.fillText(
          decoding.has(track.id) ? 'Decoding…' : 'Queued…',
          startX + Math.round(6 * dpr),
          height / 2 - Math.round(4 * dpr)
        );
      }

      currentX = nextX;
    });

    // 3. Draw Selection Highlight Overlay
    if (selection) {
      const selStartX = selection.start * scale;
      const selEndX = selection.end * scale;
      const selWidth = selEndX - selStartX;

      // Transparent red selection shading
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.fillRect(selStartX, 0, selWidth, height);

      // Selection edges (dotted red lines)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5 * dpr;
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(selStartX, 0);
      ctx.lineTo(selStartX, height);
      ctx.moveTo(selEndX, 0);
      ctx.lineTo(selEndX, height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Top selection red highlight line
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(selStartX, 0, selWidth, Math.round(2 *.5 * dpr));
    }

    // 4. Draw Playhead
    const playheadX = playback.currentTime * scale;
    if (playheadX >= 0 && playheadX <= width) {
      // Playhead vertical line
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Top circular cap
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(playheadX, Math.round(3 * dpr), Math.round(3.5 * dpr), 0, Math.PI * 2);
      ctx.fill();
    }
  }, [sortedTracks, buffers, decoding, totalDuration, playback.currentTime, state.activeTrackId, selection]);

  // Click & Drag range selection gesture handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || totalDuration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const clickTime = clickPercent * totalDuration;

    dragStartRef.current = { x: e.clientX, time: clickTime };
    setIsDraggingRange(false);

    const onGlobalMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = Math.abs(moveEvent.clientX - dragStartRef.current.x);
      const canvasRect = canvas.getBoundingClientRect();
      const moveX = moveEvent.clientX - canvasRect.left;
      const movePercent = Math.max(0, Math.min(1, moveX / canvasRect.width));
      const hoverTime = movePercent * totalDuration;

      if (deltaX > 6) {
        setIsDraggingRange(true);
        setSelection({
          start: Math.min(dragStartRef.current.time, hoverTime),
          end: Math.max(dragStartRef.current.time, hoverTime),
        });
      }
    };

    const onGlobalMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);

      if (dragStartRef.current) {
        const deltaX = Math.abs(upEvent.clientX - dragStartRef.current.x);
        if (deltaX > 6) {
          // Finished dragging a selection range
        } else {
          // Single click -> seek and select clip segment
          setSelection(null);
          const canvasRect = canvas.getBoundingClientRect();
          const upX = upEvent.clientX - canvasRect.left;
          const upPercent = Math.max(0, Math.min(1, upX / canvasRect.width));
          const seekTime = upPercent * totalDuration;

          let elapsed = 0;
          let clickedTrackId: string | null = null;
          for (const track of sortedTracks) {
            const clipDuration = track.trimEnd - track.trimStart;
            if (seekTime >= elapsed && seekTime <= elapsed + clipDuration) {
              clickedTrackId = track.id;
              break;
            }
            elapsed += clipDuration;
          }
          if (clickedTrackId) {
            setActiveTrack(clickedTrackId);
          }

          document.dispatchEvent(new CustomEvent('sunocraft:seek', { detail: seekTime }));
          if (onSeek) onSeek(seekTime);
        }
        dragStartRef.current = null;
        setIsDraggingRange(false);
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
  };

  // Hover detection for tooltips
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || totalDuration === 0 || isDraggingRange) return;

    const rect = canvas.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverPercent = hoverX / rect.width;
    const hoverTime = hoverPercent * totalDuration;

    let elapsed = 0;
    let foundTrackId: string | null = null;
    for (const track of sortedTracks) {
      const duration = track.trimEnd - track.trimStart;
      if (hoverTime >= elapsed && hoverTime <= elapsed + duration) {
        foundTrackId = track.id;
        break;
      }
      elapsed += duration;
    }

    setHoveredTrackId(foundTrackId);
    setTooltipX(e.clientX - rect.left);
    setTooltipY(e.clientY - rect.top - 40);
  };

  const handleMouseLeave = () => {
    setHoveredTrackId(null);
  };

  // Split Active Clip at Playhead
  const splitActiveTrackAtPlayhead = () => {
    if (!state.activeTrackId) return;
    const activeTrack = sortedTracks.find((t) => t.id === state.activeTrackId);
    if (!activeTrack) return;

    let elapsed = 0;
    for (const track of sortedTracks) {
      const duration = track.trimEnd - track.trimStart;
      if (track.id === activeTrack.id) break;
      elapsed += duration;
    }

    const playTime = playback.currentTime;
    const offsetInTrack = playTime - elapsed;
    const clipDuration = activeTrack.trimEnd - activeTrack.trimStart;

    if (offsetInTrack > 0.05 && offsetInTrack < clipDuration - 0.05) {
      const absoluteSplit = activeTrack.trimStart + offsetInTrack;
      splitTrack(activeTrack.id, absoluteSplit, generateId(), generateId());
    } else {
      alert('Playhead must be inside the selected song clip segment.');
    }
  };

  // Replace active track file
  const handleReplaceActiveTrackFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !state.activeTrackId) return;
    const file = e.target.files[0];

    try {
      const duration = await getAudioDuration(file);
      const updatedTracks = sortedTracks.map((t) => {
        if (t.id === state.activeTrackId) {
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
      e.target.value = '';
    }
  };

  // Delete active clip
  const deleteActiveClip = () => {
    if (!state.activeTrackId) return;
    removeTrack(state.activeTrackId);
  };

  // Delete selected range from the timeline
  const deleteRange = (start: number, end: number) => {
    if (start >= end) return;

    const newTracks: AudioTrack[] = [];
    let clipStart = 0;

    for (const track of sortedTracks) {
      const clipDuration = track.trimEnd - track.trimStart;
      const clipEnd = clipStart + clipDuration;

      if (clipEnd <= start) {
        newTracks.push({ ...track });
      } else if (clipStart >= end) {
        newTracks.push({ ...track });
      } else {
        // Overlaps with selection range
        if (clipStart < start && clipEnd > end) {
          // Split middle section
          const offsetStart = start - clipStart;
          const offsetEnd = end - clipStart;
          const part1 = {
            ...track,
            id: generateId(),
            name: `${track.name.replace(/\.[^/.]+$/, '')} (A)`,
            trimEnd: track.trimStart + offsetStart,
          };
          const part2 = {
            ...track,
            id: generateId(),
            name: `${track.name.replace(/\.[^/.]+$/, '')} (B)`,
            trimStart: track.trimStart + offsetEnd,
            previewUrl: URL.createObjectURL(track.file),
          };
          newTracks.push(part1, part2);
        } else if (clipStart < start && clipEnd > start) {
          // Trim end
          const offset = start - clipStart;
          newTracks.push({
            ...track,
            trimEnd: track.trimStart + offset,
          });
        } else if (clipStart < end && clipEnd > end) {
          // Trim start
          const offset = end - clipStart;
          newTracks.push({
            ...track,
            trimStart: track.trimStart + offset,
          });
        } else {
          // Completely covered by selection -> delete
          URL.revokeObjectURL(track.previewUrl);
        }
      }
      clipStart = clipEnd;
    }

    reorderTracks(newTracks);
    setSelection(null);
  };

  // Replace selection range with a file
  const handleReplaceRangeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selection) return;
    const file = e.target.files[0];
    const { start, end } = selection;

    try {
      const duration = await getAudioDuration(file);
      const newTrack: AudioTrack = {
        id: generateId(),
        name: file.name,
        file,
        duration,
        trimStart: 0,
        trimEnd: duration,
        order: 0,
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
        color: TRACK_COLORS[sortedTracks.length % TRACK_COLORS.length],
      };

      const newTracks: AudioTrack[] = [];
      let clipStart = 0;
      let inserted = false;

      for (const track of sortedTracks) {
        const clipDuration = track.trimEnd - track.trimStart;
        const clipEnd = clipStart + clipDuration;

        if (clipEnd <= start) {
          newTracks.push({ ...track });
        } else if (clipStart >= end) {
          if (!inserted) {
            newTracks.push(newTrack);
            inserted = true;
          }
          newTracks.push({ ...track });
        } else {
          // Overlaps with selection range
          if (clipStart < start && clipEnd > end) {
            const offsetStart = start - clipStart;
            const offsetEnd = end - clipStart;
            const part1 = {
              ...track,
              id: generateId(),
              name: `${track.name.replace(/\.[^/.]+$/, '')} (A)`,
              trimEnd: track.trimStart + offsetStart,
            };
            const part2 = {
              ...track,
              id: generateId(),
              name: `${track.name.replace(/\.[^/.]+$/, '')} (B)`,
              trimStart: track.trimStart + offsetEnd,
              previewUrl: URL.createObjectURL(track.file),
            };
            newTracks.push(part1);
            newTracks.push(newTrack);
            newTracks.push(part2);
            inserted = true;
          } else if (clipStart < start && clipEnd > start) {
            const offset = start - clipStart;
            newTracks.push({
              ...track,
              trimEnd: track.trimStart + offset,
            });
            if (!inserted) {
              newTracks.push(newTrack);
              inserted = true;
            }
          } else if (clipStart < end && clipEnd > end) {
            const offset = end - clipStart;
            if (!inserted) {
              newTracks.push(newTrack);
              inserted = true;
            }
            newTracks.push({
              ...track,
              trimStart: track.trimStart + offset,
            });
          } else {
            // Completely covered by selection -> delete
            URL.revokeObjectURL(track.previewUrl);
          }
        }
        clipStart = clipEnd;
      }

      if (!inserted) {
        newTracks.push(newTrack);
      }

      reorderTracks(newTracks);
      setSelection(null);
    } catch (err) {
      console.error('Error replacing selection range:', err);
    } finally {
      e.target.value = '';
    }
  };

  const togglePlayPause = () => {
    document.dispatchEvent(new CustomEvent('sunocraft:playpause'));
  };

  const handleStop = () => {
    document.dispatchEvent(new CustomEvent('sunocraft:stop'));
  };

  const hoveredTrack = sortedTracks.find((t) => t.id === hoveredTrackId);

  return (
    <div className="w-full bg-zinc-950/80 border border-white/[0.06] rounded-xl p-2.5 flex flex-col gap-2 relative">
      {/* Waveform Controls Header */}
      <div className="flex flex-col gap-1.5 px-1 border-b border-white/[0.04] pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
              Composition Scrubber (Concat Sequence)
            </span>
            <div className="flex items-center gap-1 bg-zinc-900 border border-white/[0.08] rounded px-1.5 py-0.5">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                disabled={sortedTracks.length === 0}
                className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                title="Play/Pause"
              >
                {playback.isPlaying ? (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                ) : (
                  <svg className="w-2.5 h-2.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              {/* Stop */}
              <button
                onClick={handleStop}
                disabled={sortedTracks.length === 0}
                className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                title="Stop"
              >
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
              </button>
            </div>
          </div>

          {/* Time Status */}
          <div className="text-[10px] text-zinc-500 font-mono tabular-nums">
            <span className="text-cyan-400 font-semibold">{formatDuration(playback.currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>

        {/* Dynamic Context Editing Toolbar */}
        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/[0.02] min-h-6">
          {selection ? (
            /* Range Mode Actions */
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Range: {formatDuration(selection.start)} - {formatDuration(selection.end)}
              </span>
              <button
                onClick={() => deleteRange(selection.start, selection.end)}
                className="text-[9px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded transition-all"
              >
                Delete Selected Range
              </button>
              <button
                onClick={() => replaceRangeInputRef.current?.click()}
                className="text-[9px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded transition-all"
              >
                Replace Selection Range
              </button>
              <button
                onClick={() => setSelection(null)}
                className="text-[9px] font-semibold text-zinc-400 hover:text-zinc-300 px-2 py-0.5 bg-white/5 border border-white/10 rounded transition-all"
              >
                Clear Selection
              </button>
            </div>
          ) : state.activeTrackId ? (
            /* Clip Mode Actions for selected track */
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-400">
                Selected Clip: <span className="font-semibold text-zinc-300">{sortedTracks.find((t) => t.id === state.activeTrackId)?.name.substring(0, 15)}...</span>
              </span>
              <button
                onClick={splitActiveTrackAtPlayhead}
                className="text-[9px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded transition-all"
              >
                Split at Playhead
              </button>
              <button
                onClick={() => replaceTrackInputRef.current?.click()}
                className="text-[9px] font-semibold text-zinc-400 hover:text-zinc-300 px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all"
              >
                Replace Clip File
              </button>
              <button
                onClick={deleteActiveClip}
                className="text-[9px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded transition-all"
              >
                Delete Clip
              </button>
            </div>
          ) : (
            <span className="text-[9px] text-zinc-600">
              Click to select a clip segment, or drag to select a range to delete/replace.
            </span>
          )}
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="relative h-16 w-full rounded-lg overflow-hidden bg-black border border-white/[0.04]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-pointer hover:bg-white/[0.01] transition-colors"
        />

        {/* HTML Tooltip on Hover */}
        {hoveredTrack && !isDraggingRange && (
          <div
            className="absolute z-10 pointer-events-none bg-zinc-900 border border-white/10 rounded px-2 py-1 text-[9px] text-zinc-300 font-sans shadow-lg shadow-black/80 flex flex-col gap-0.5"
            style={{
              left: `${Math.min(tooltipX, (canvasRef.current?.clientWidth ?? 0) - 120)}px`,
              top: `${Math.max(0, tooltipY)}px`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hoveredTrack.color }} />
              <span className="font-bold text-white truncate max-w-[100px]">{hoveredTrack.name}</span>
            </div>
            <span>
              Duration: <span className="font-mono">{formatDuration(hoveredTrack.trimEnd - hoveredTrack.trimStart)}</span>
            </span>
            <span>
              Volume: <span className="font-mono">{Math.round(hoveredTrack.volume * 100)}%</span>
            </span>
          </div>
        )}
      </div>

      {/* Hidden File Inputs for Timeline Editing */}
      <input
        ref={replaceRangeInputRef}
        type="file"
        accept="audio/*"
        onChange={handleReplaceRangeFileSelect}
        className="hidden"
      />
      <input
        ref={replaceTrackInputRef}
        type="file"
        accept="audio/*"
        onChange={handleReplaceActiveTrackFileSelect}
        className="hidden"
      />
    </div>
  );
}


