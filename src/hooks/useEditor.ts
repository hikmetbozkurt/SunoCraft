import { useContext, useCallback, useMemo } from 'react';
import { EditorContext } from '../context/EditorContext';
import type { AudioTrack, BackgroundMedia, OutputFormat, RenderState, PlaybackState } from '../types';

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within an EditorProvider');
  }

  const { state, dispatch, canUndo, canRedo } = ctx;

  // ── Track Management ──────────────────────────────────────────
  const addTracks = useCallback(
    (tracks: AudioTrack[]) => dispatch({ type: 'ADD_TRACKS', payload: tracks }),
    [dispatch]
  );

  const removeTrack = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_TRACK', payload: id }),
    [dispatch]
  );

  const reorderTracks = useCallback(
    (tracks: AudioTrack[]) => dispatch({ type: 'REORDER_TRACKS', payload: tracks }),
    [dispatch]
  );

  const updateTrim = useCallback(
    (id: string, trimStart: number, trimEnd: number) =>
      dispatch({ type: 'UPDATE_TRIM', payload: { id, trimStart, trimEnd } }),
    [dispatch]
  );

  const splitTrack = useCallback(
    (id: string, splitTime: number, firstPartId: string, secondPartId: string) =>
      dispatch({ type: 'SPLIT_TRACK', payload: { id, splitTime, firstPartId, secondPartId } }),
    [dispatch]
  );

  // ── Track Properties ──────────────────────────────────────────
  const setTrackVolume = useCallback(
    (id: string, volume: number) => dispatch({ type: 'SET_TRACK_VOLUME', payload: { id, volume } }),
    [dispatch]
  );

  const setTrackGain = useCallback(
    (id: string, gain: number) => dispatch({ type: 'SET_TRACK_GAIN', payload: { id, gain } }),
    [dispatch]
  );

  const setTrackPan = useCallback(
    (id: string, pan: number) => dispatch({ type: 'SET_TRACK_PAN', payload: { id, pan } }),
    [dispatch]
  );

  const setTrackFade = useCallback(
    (id: string, fadeIn: number, fadeOut: number) =>
      dispatch({ type: 'SET_TRACK_FADE', payload: { id, fadeIn, fadeOut } }),
    [dispatch]
  );

  const toggleMute = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_MUTE', payload: id }),
    [dispatch]
  );

  const toggleSolo = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_SOLO', payload: id }),
    [dispatch]
  );

  const toggleLock = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_LOCK', payload: id }),
    [dispatch]
  );

  const setTrackColor = useCallback(
    (id: string, color: string) => dispatch({ type: 'SET_TRACK_COLOR', payload: { id, color } }),
    [dispatch]
  );

  const renameTrack = useCallback(
    (id: string, name: string) => dispatch({ type: 'RENAME_TRACK', payload: { id, name } }),
    [dispatch]
  );

  // ── Background ────────────────────────────────────────────────
  const setBackground = useCallback(
    (media: BackgroundMedia | null) => dispatch({ type: 'SET_BACKGROUND', payload: media }),
    [dispatch]
  );

  // ── Format / Export ───────────────────────────────────────────
  const setFormat = useCallback(
    (format: OutputFormat) => dispatch({ type: 'SET_FORMAT', payload: format }),
    [dispatch]
  );

  const setRenderState = useCallback(
    (renderState: Partial<RenderState>) =>
      dispatch({ type: 'SET_RENDER_STATE', payload: renderState }),
    [dispatch]
  );

  const toggleExportDialog = useCallback(
    (open?: boolean) => dispatch({ type: 'TOGGLE_EXPORT_DIALOG', payload: open }),
    [dispatch]
  );

  // ── Playback ──────────────────────────────────────────────────
  const setPlayback = useCallback(
    (playback: Partial<PlaybackState>) => dispatch({ type: 'SET_PLAYBACK', payload: playback }),
    [dispatch]
  );

  // ── UI ────────────────────────────────────────────────────────
  const toggleUploadModal = useCallback(
    (open?: boolean) => dispatch({ type: 'TOGGLE_UPLOAD_MODAL', payload: open }),
    [dispatch]
  );

  const toggleSettings = useCallback(
    (open?: boolean) => dispatch({ type: 'TOGGLE_SETTINGS', payload: open }),
    [dispatch]
  );

  const setActiveTrack = useCallback(
    (id: string | null) => dispatch({ type: 'SET_ACTIVE_TRACK', payload: id }),
    [dispatch]
  );

  const setTimelineZoom = useCallback(
    (zoom: number) => dispatch({ type: 'SET_TIMELINE_ZOOM', payload: zoom }),
    [dispatch]
  );

  const setPanelSize = useCallback(
    (panel: 'sidebar' | 'properties' | 'preview', size: number) =>
      dispatch({ type: 'SET_PANEL_SIZE', payload: { panel, size } }),
    [dispatch]
  );

  // ── Undo / Redo ───────────────────────────────────────────────
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  // ── Computed Values ───────────────────────────────────────────
  const sortedTracks = useMemo(
    () => [...state.tracks].sort((a, b) => a.order - b.order),
    [state.tracks]
  );

  const totalDuration = useMemo(
    () => state.tracks.reduce((sum, t) => sum + (t.trimEnd - t.trimStart), 0),
    [state.tracks]
  );

  const activeTrack = useMemo(
    () => state.tracks.find(t => t.id === state.activeTrackId) || null,
    [state.tracks, state.activeTrackId]
  );

  const canRender =
    state.tracks.length > 0 &&
    state.renderState.status !== 'processing' &&
    state.renderState.status !== 'loading-ffmpeg';

  // Check if any track has solo enabled
  const hasSolo = state.tracks.some(t => t.solo);

  return {
    state,
    dispatch,
    // Track management
    addTracks,
    removeTrack,
    reorderTracks,
    updateTrim,
    splitTrack,
    // Track properties
    setTrackVolume,
    setTrackGain,
    setTrackPan,
    setTrackFade,
    toggleMute,
    toggleSolo,
    toggleLock,
    setTrackColor,
    renameTrack,
    // Background
    setBackground,
    // Format / Export
    setFormat,
    setRenderState,
    toggleExportDialog,
    // Playback
    setPlayback,
    // UI
    toggleUploadModal,
    toggleSettings,
    setActiveTrack,
    setTimelineZoom,
    setPanelSize,
    // Undo / Redo
    undo,
    redo,
    canUndo,
    canRedo,
    // Reset
    reset,
    // Computed
    sortedTracks,
    totalDuration,
    activeTrack,
    canRender,
    hasSolo,
  };
}
