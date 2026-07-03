import type { AudioTrack, OutputFormat, BackgroundMedia } from '../types';

/**
 * Trim argümanlarını oluşturur (bir tekil ses dosyası için).
 * FFmpeg: -ss <start> -t <duration>
 */
function buildTrimFilter(track: AudioTrack, inputIndex: number): string[] {
  const duration = track.trimEnd - track.trimStart;
  if (track.trimStart === 0 && track.trimEnd === track.duration) {
    // Kırpma yok — doğrudan kullan
    return [`[${inputIndex}:a]acopy[a${inputIndex}]`];
  }
  return [
    `[${inputIndex}:a]atrim=start=${track.trimStart}:duration=${duration},asetpts=PTS-STARTPTS[a${inputIndex}]`,
  ];
}

/**
 * Birden fazla ses dosyasını uç uca birleştirmek için FFmpeg argümanları oluşturur.
 * Çıktı: birleştirilmiş ses dosyası
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
    // Tek dosya — sadece kırpma uygula
    const t = tracks[0];
    const duration = t.trimEnd - t.trimStart;
    const args = [...inputArgs];
    if (t.trimStart > 0 || t.trimEnd < t.duration) {
      args.push('-ss', t.trimStart.toString(), '-t', duration.toString());
    }
    args.push('-y', `output${outputFormat}`);
    return args;
  }

  // Birden fazla dosya — filter_complex ile concat
  const filterParts: string[] = [];
  tracks.forEach((track, i) => {
    filterParts.push(...buildTrimFilter(track, i));
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
 * Birleştirilmiş ses + arka plan görseli/GIF ile video oluşturmak için FFmpeg argümanları.
 * Görsel, toplam ses uzunluğu kadar döngüye sokulur (-stream_loop).
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

  // Step 1: Önce sesleri birleştir → temp_audio.wav
  // Step 2: Sonra görsel + birleştirilmiş ses → output.mp4
  // Bunu iki ayrı exec çağrısı olarak yapacağız, burada sadece video oluşturma kısmı

  const args: string[] = [];

  if (background.type === 'gif') {
    // GIF için: -ignore_loop 0 ile sonsuz döngü, sonra -t ile kes
    args.push(
      '-ignore_loop', '0',
      '-i', background.name,
      '-i', 'temp_audio.wav',
      '-t', totalDuration.toString(),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-y',
      'output.mp4'
    );
  } else {
    // Statik görsel için: -stream_loop -1 ile döngü
    args.push(
      '-stream_loop', '-1',
      '-i', background.name,
      '-i', 'temp_audio.wav',
      '-t', totalDuration.toString(),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-y',
      'output.mp4'
    );
  }

  return args;
}

/**
 * Sadece ses birleştirme argümanları (video oluşturma öncesi ara adım).
 * Çıktı: temp_audio.wav
 */
export function buildMergeAudioArgs(tracks: AudioTrack[]): string[] {
  if (tracks.length === 0) return [];

  const inputArgs: string[] = [];
  tracks.forEach((track) => {
    inputArgs.push('-i', track.name);
  });

  if (tracks.length === 1) {
    const t = tracks[0];
    const duration = t.trimEnd - t.trimStart;
    const args = [...inputArgs];
    if (t.trimStart > 0 || t.trimEnd < t.duration) {
      args.push('-ss', t.trimStart.toString(), '-t', duration.toString());
    }
    args.push('-y', 'temp_audio.wav');
    return args;
  }

  const filterParts: string[] = [];
  tracks.forEach((track, i) => {
    filterParts.push(...buildTrimFilter(track, i));
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
