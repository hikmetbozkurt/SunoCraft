import type { AudioTrack, OutputFormat, BackgroundMedia } from '../types';

/**
 * Build the full filter chain for a single audio track.
 * Applies: trim → volume+gain → pan → fade-in → fade-out
 */
function buildTrackFilter(track: AudioTrack, inputIndex: number): string[] {
  const filters: string[] = [];
  const clipDuration = track.trimEnd - track.trimStart;
  let currentLabel = `${inputIndex}:a`;

  // 1) Trim (if needed)
  if (track.trimStart > 0 || track.trimEnd < track.duration) {
    const nextLabel = `trim${inputIndex}`;
    filters.push(
      `[${currentLabel}]atrim=start=${track.trimStart}:duration=${clipDuration},asetpts=PTS-STARTPTS[${nextLabel}]`
    );
    currentLabel = nextLabel;
  }

  // 2) Volume + Gain (dB → linear multiplier)
  const gainLinear = Math.pow(10, track.gain / 20);
  const combinedVolume = track.volume * gainLinear;
  if (combinedVolume !== 1) {
    const nextLabel = `vol${inputIndex}`;
    filters.push(
      `[${currentLabel}]volume=${combinedVolume.toFixed(4)}[${nextLabel}]`
    );
    currentLabel = nextLabel;
  }

  // 3) Pan (stereo balance: -1 left, 0 center, +1 right)
  if (track.pan !== 0) {
    const nextLabel = `pan${inputIndex}`;
    // Convert -1..+1 pan to left/right gain using constant-power panning
    const leftGain = Math.cos(((track.pan + 1) / 2) * (Math.PI / 2));
    const rightGain = Math.sin(((track.pan + 1) / 2) * (Math.PI / 2));
    filters.push(
      `[${currentLabel}]pan=stereo|c0=${leftGain.toFixed(4)}*c0|c1=${rightGain.toFixed(4)}*c1[${nextLabel}]`
    );
    currentLabel = nextLabel;
  }

  // 4) Fade In
  if (track.fadeIn > 0) {
    const nextLabel = `fi${inputIndex}`;
    filters.push(
      `[${currentLabel}]afade=t=in:d=${track.fadeIn}[${nextLabel}]`
    );
    currentLabel = nextLabel;
  }

  // 5) Fade Out
  if (track.fadeOut > 0) {
    const fadeOutStart = Math.max(0, clipDuration - track.fadeOut);
    const nextLabel = `fo${inputIndex}`;
    filters.push(
      `[${currentLabel}]afade=t=out:st=${fadeOutStart}:d=${track.fadeOut}[${nextLabel}]`
    );
    currentLabel = nextLabel;
  }

  // If no filters were applied, just copy
  if (filters.length === 0) {
    filters.push(`[${currentLabel}]anull[a${inputIndex}]`);
  } else {
    // Rename last label to the standard output label
    const lastFilter = filters[filters.length - 1];
    const lastLabel = currentLabel;
    filters[filters.length - 1] = lastFilter.replace(
      `[${lastLabel}]`,
      `[a${inputIndex}]`
    );
  }

  return filters;
}

/**
 * Build FFmpeg arguments to concatenate multiple audio tracks into a single output.
 * Applies trim, volume, gain, pan, and fade filters per track.
 */
export function buildAudioConcatArgs(
  tracks: AudioTrack[],
  outputFormat: OutputFormat
): string[] {
  if (tracks.length === 0) return [];

  const inputArgs: string[] = [];
  tracks.forEach((track) => {
    inputArgs.push('-i', track.name);
  });

  if (tracks.length === 1) {
    // Single track — use filter_complex for all effects
    const filterParts = buildTrackFilter(tracks[0], 0);
    return [
      ...inputArgs,
      '-filter_complex', filterParts.join(';'),
      '-map', '[a0]',
      '-y',
      `output${outputFormat}`,
    ];
  }

  // Multiple tracks — filter_complex with concat
  const filterParts: string[] = [];
  tracks.forEach((track, i) => {
    filterParts.push(...buildTrackFilter(track, i));
  });

  const concatInputs = tracks.map((_, i) => `[a${i}]`).join('');
  filterParts.push(`${concatInputs}concat=n=${tracks.length}:v=0:a=1[outa]`);

  return [
    ...inputArgs,
    '-filter_complex', filterParts.join(';'),
    '-map', '[outa]',
    '-y',
    `output${outputFormat}`,
  ];
}

/**
 * Build FFmpeg arguments to create a video from background media + merged audio.
 * Handles static images (loop via -loop 1), GIFs (loop via -ignore_loop 0),
 * and video backgrounds.
 * Adds scale filter to ensure even dimensions for libx264/yuv420p.
 */
export function buildVideoArgs(
  tracks: AudioTrack[],
  background: BackgroundMedia
): string[] {
  if (tracks.length === 0) return [];

  const totalDuration = tracks.reduce(
    (sum, t) => sum + (t.trimEnd - t.trimStart),
    0
  );

  const args: string[] = [];

  // Scale filter to ensure even dimensions (libx264 + yuv420p requirement)
  const scaleFilter = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';

  if (background.type === 'gif') {
    // GIF: use -ignore_loop 0 for infinite looping, then cut with -t
    args.push(
      '-ignore_loop', '0',
      '-i', background.name,
      '-i', 'temp_audio.wav',
      '-t', totalDuration.toString(),
      '-vf', scaleFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      'output.mp4'
    );
  } else if (background.type === 'video') {
    // Video background: loop with -stream_loop, then cut with -t
    args.push(
      '-stream_loop', '-1',
      '-i', background.name,
      '-i', 'temp_audio.wav',
      '-t', totalDuration.toString(),
      '-vf', scaleFilter,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      'output.mp4'
    );
  } else {
    // Static image: use -loop 1 with low framerate for efficiency
    args.push(
      '-loop', '1',
      '-framerate', '1',
      '-i', background.name,
      '-i', 'temp_audio.wav',
      '-t', totalDuration.toString(),
      '-vf', `${scaleFilter},fps=24`,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-y',
      'output.mp4'
    );
  }

  return args;
}

/**
 * Build FFmpeg arguments to merge all audio tracks into a single temp_audio.wav.
 * This is the intermediate step before combining with video.
 * Applies all per-track audio filters (volume, gain, pan, fades).
 */
export function buildMergeAudioArgs(tracks: AudioTrack[]): string[] {
  if (tracks.length === 0) return [];

  const inputArgs: string[] = [];
  tracks.forEach((track) => {
    inputArgs.push('-i', track.name);
  });

  if (tracks.length === 1) {
    // Single track — use filter_complex for all effects
    const filterParts = buildTrackFilter(tracks[0], 0);
    return [
      ...inputArgs,
      '-filter_complex', filterParts.join(';'),
      '-map', '[a0]',
      '-y',
      'temp_audio.wav',
    ];
  }

  const filterParts: string[] = [];
  tracks.forEach((track, i) => {
    filterParts.push(...buildTrackFilter(track, i));
  });

  const concatInputs = tracks.map((_, i) => `[a${i}]`).join('');
  filterParts.push(`${concatInputs}concat=n=${tracks.length}:v=0:a=1[outa]`);

  return [
    ...inputArgs,
    '-filter_complex', filterParts.join(';'),
    '-map', '[outa]',
    '-y',
    'temp_audio.wav',
  ];
}
