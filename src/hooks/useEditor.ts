import { useContext, useCallback } from 'react';
import { EditorContext } from '../context/EditorContext';
import type { AudioTrack, BackgroundMedia, OutputFormat, RenderState } from '../types';

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within an EditorProvider');
  }

  const { state, dispatch } = ctx;

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

  const setBackground = useCallback(
    (media: BackgroundMedia | null) => dispatch({ type: 'SET_BACKGROUND', payload: media }),
    [dispatch]
  );

  const setFormat = useCallback(
    (format: OutputFormat) => dispatch({ type: 'SET_FORMAT', payload: format }),
    [dispatch]
  );

  const setRenderState = useCallback(
    (renderState: Partial<RenderState>) =>
      dispatch({ type: 'SET_RENDER_STATE', payload: renderState }),
    [dispatch]
  );

  const toggleUploadModal = useCallback(
    (open?: boolean) => dispatch({ type: 'TOGGLE_UPLOAD_MODAL', payload: open }),
    [dispatch]
  );

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [dispatch]);

  // Computed
  const totalDuration = state.tracks.reduce(
    (sum, t) => sum + (t.trimEnd - t.trimStart),
    0
  );

  const sortedTracks = [...state.tracks].sort((a, b) => a.order - b.order);

  const canRender =
    state.tracks.length > 0 &&
    state.renderState.status !== 'processing' &&
    state.renderState.status !== 'loading-ffmpeg';

  return {
    state,
    dispatch,
    // Actions
    addTracks,
    removeTrack,
    reorderTracks,
    updateTrim,
    setBackground,
    setFormat,
    setRenderState,
    toggleUploadModal,
    reset,
    // Computed
    totalDuration,
    sortedTracks,
    canRender,
  };
}
