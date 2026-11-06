const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function createWavHeader(numSamples, numChannels = 1, sampleRate = SAMPLE_RATE, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

// Generate sound with multiple harmonic notes
function generateNoteTone(freq, durationSec, type = 'marimba') {
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let envelope = 0;

    if (type === 'marimba') {
      const attack = 0.005;
      envelope = t < attack ? t / attack : Math.exp(-4.5 * (t - attack));
      const s1 = Math.sin(2 * Math.PI * freq * t);
      const s2 = 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
      const s3 = 0.15 * Math.sin(2 * Math.PI * freq * 3 * t);
      samples[i] = (s1 + s2 + s3) * envelope * 0.7;
    } else if (type === 'bell') {
      const attack = 0.008;
      envelope = t < attack ? t / attack : Math.exp(-1.8 * (t - attack));
      const s1 = Math.sin(2 * Math.PI * freq * t);
      const s2 = 0.5 * Math.sin(2 * Math.PI * freq * 2.76 * t);
      const s3 = 0.25 * Math.sin(2 * Math.PI * freq * 5.4 * t);
      const s4 = 0.1 * Math.sin(2 * Math.PI * freq * 0.5 * t);
      samples[i] = (s1 + s2 + s3 + s4) * envelope * 0.6;
    } else if (type === 'harp') {
      const attack = 0.004;
      envelope = t < attack ? t / attack : Math.exp(-2.8 * (t - attack));
      const s1 = Math.sin(2 * Math.PI * freq * t);
      const s2 = 0.4 * Math.sin(2 * Math.PI * freq * 2 * t);
      const s3 = 0.2 * Math.sin(2 * Math.PI * freq * 3 * t);
      samples[i] = (s1 + s2 + s3) * envelope * 0.65;
    } else if (type === 'crystal') {
      const attack = 0.003;
      envelope = t < attack ? t / attack : Math.exp(-3.5 * (t - attack));
      const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 6 * t);
      const s1 = Math.sin(2 * Math.PI * freq * vibrato * t);
      const s2 = 0.3 * Math.sin(2 * Math.PI * freq * 2.01 * t);
      const s3 = 0.15 * Math.sin(2 * Math.PI * freq * 4.02 * t);
      samples[i] = (s1 + s2 + s3) * envelope * 0.7;
    } else if (type === 'slowed_synth') {
      // Nevada slowed chill synth with dreamy sustain and chorus
      const attack = 0.025;
      envelope = t < attack ? t / attack : Math.exp(-1.4 * (t - attack));
      const s1 = Math.sin(2 * Math.PI * freq * t);
      const s2 = 0.45 * Math.sin(2 * Math.PI * freq * 2 * t);
      const s3 = 0.25 * Math.sin(2 * Math.PI * freq * 3 * t);
      const sDetune1 = 0.2 * Math.sin(2 * Math.PI * (freq * 0.998) * t);
      const sDetune2 = 0.2 * Math.sin(2 * Math.PI * (freq * 1.002) * t);
      samples[i] = (s1 + s2 + s3 + sDetune1 + sDetune2) * envelope * 0.55;
    } else if (type === 'piano') {
      // In Another Life - warm emotional grand piano
      const attack = 0.003;
      envelope = t < attack ? t / attack : Math.exp(-2.0 * (t - attack));
      const s1 = Math.sin(2 * Math.PI * freq * t);
      const s2 = 0.5 * Math.sin(2 * Math.PI * freq * 2 * t);
      const s3 = 0.25 * Math.sin(2 * Math.PI * freq * 3 * t);
      const s4 = 0.12 * Math.sin(2 * Math.PI * freq * 4 * t);
      const warmth = 0.15 * Math.sin(2 * Math.PI * (freq * 0.5) * t); // subtle warm sub
      samples[i] = (s1 + s2 + s3 + s4 + warmth) * envelope * 0.6;
    } else if (type === 'guitar') {
      // Wild Flower - acoustic guitar / kalimba picking
      const attack = 0.004;
      envelope = t < attack ? t / attack : Math.exp(-2.5 * (t - attack));
      const s1 = Math.sin(2 * Math.PI * freq * t);
      const s2 = 0.4 * Math.sin(2 * Math.PI * freq * 2 * t);
      const s3 = 0.2 * Math.sin(2 * Math.PI * freq * 3 * t);
      const s4 = 0.1 * Math.sin(2 * Math.PI * freq * 4 * t);
      samples[i] = (s1 + s2 + s3 + s4) * envelope * 0.65;
    } else if (type === 'roneat') {
      // Bong Kror - Traditional Khmer Roneat Ek (រនាតឯក) bamboo xylophone
      const attack = 0.002;
      envelope = t < attack ? t / attack : Math.exp(-3.4 * (t - attack));
      const s1 = Math.sin(2 * Math.PI * freq * t);
      const s2 = 0.45 * Math.sin(2 * Math.PI * freq * 2.75 * t);
      const s3 = 0.25 * Math.sin(2 * Math.PI * freq * 5.2 * t);
      // Wooden click mallet transient at start
      const click = t < 0.015 ? (Math.random() * 2 - 1) * Math.exp(-200 * t) * 0.25 : 0;
      samples[i] = ((s1 + s2 + s3) * envelope + click) * 0.65;
    }
  }

  return samples;
}

function mixSequence(sequence, totalDuration) {
  const totalSamples = Math.floor(SAMPLE_RATE * totalDuration);
  const mixed = new Float32Array(totalSamples);

  for (const item of sequence) {
    const { freq, startSec, durationSec, type = 'marimba' } = item;
    const noteSamples = generateNoteTone(freq, durationSec, type);
    const startSample = Math.floor(startSec * SAMPLE_RATE);

    for (let i = 0; i < noteSamples.length; i++) {
      if (startSample + i < totalSamples) {
        mixed[startSample + i] += noteSamples[i];
      }
    }
  }

  // Normalize to prevent clipping
  let maxAmp = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(mixed[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  const gain = maxAmp > 0.95 ? 0.95 / maxAmp : 0.95;

  const pcmBuffer = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    let s = mixed[i] * gain;
    s = Math.max(-1, Math.min(1, s));
    const int16 = s < 0 ? s * 32768 : s * 32767;
    pcmBuffer.writeInt16LE(Math.floor(int16), i * 2);
  }

  const header = createWavHeader(totalSamples);
  return Buffer.concat([header, pcmBuffer]);
}

const outDir = path.join(__dirname, '..', 'frontend', 'public', 'audio');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Generating high-quality audio melodies in: ${outDir}`);

// 1. Upbeat Welcome Melody (Marimba)
const welcomeMelody = [
  { freq: 523.25, startSec: 0.00, durationSec: 0.8, type: 'marimba' },
  { freq: 659.25, startSec: 0.14, durationSec: 0.8, type: 'marimba' },
  { freq: 783.99, startSec: 0.28, durationSec: 0.8, type: 'marimba' },
  { freq: 880.00, startSec: 0.42, durationSec: 0.9, type: 'marimba' },
  { freq: 1046.5, startSec: 0.58, durationSec: 1.1, type: 'marimba' },
  { freq: 1318.5, startSec: 0.74, durationSec: 1.4, type: 'marimba' },
];
fs.writeFileSync(path.join(outDir, 'welcome_melody.wav'), mixSequence(welcomeMelody, 2.2));
console.log('✓ Created welcome_melody.wav');

// 2. Victory & Success Fanfare
const successFanfare = [
  { freq: 698.46, startSec: 0.00, durationSec: 0.7, type: 'crystal' },
  { freq: 880.00, startSec: 0.12, durationSec: 0.7, type: 'crystal' },
  { freq: 1046.5, startSec: 0.24, durationSec: 0.9, type: 'crystal' },
  { freq: 1318.5, startSec: 0.38, durationSec: 1.2, type: 'crystal' },
  { freq: 1567.9, startSec: 0.54, durationSec: 1.5, type: 'crystal' },
];
fs.writeFileSync(path.join(outDir, 'success_fanfare.wav'), mixSequence(successFanfare, 2.1));
console.log('✓ Created success_fanfare.wav');

// 3. School & Campus Bell
const campusBell = [
  { freq: 329.63, startSec: 0.00, durationSec: 1.8, type: 'bell' },
  { freq: 261.63, startSec: 0.55, durationSec: 1.8, type: 'bell' },
  { freq: 293.66, startSec: 1.10, durationSec: 1.8, type: 'bell' },
  { freq: 196.00, startSec: 1.70, durationSec: 2.2, type: 'bell' },
];
fs.writeFileSync(path.join(outDir, 'campus_bell.wav'), mixSequence(campusBell, 3.8));
console.log('✓ Created campus_bell.wav');

// 4. Modern Crystal Ding
const crystalDing = [
  { freq: 783.99, startSec: 0.00, durationSec: 0.8, type: 'crystal' },
  { freq: 1046.5, startSec: 0.16, durationSec: 1.4, type: 'crystal' },
];
fs.writeFileSync(path.join(outDir, 'crystal_ding.wav'), mixSequence(crystalDing, 1.6));
console.log('✓ Created crystal_ding.wav');

// 5. Gentle Zen Harp
const gentleHarp = [
  { freq: 293.66, startSec: 0.00, durationSec: 1.2, type: 'harp' },
  { freq: 369.99, startSec: 0.18, durationSec: 1.2, type: 'harp' },
  { freq: 440.00, startSec: 0.36, durationSec: 1.3, type: 'harp' },
  { freq: 493.88, startSec: 0.54, durationSec: 1.4, type: 'harp' },
  { freq: 587.33, startSec: 0.72, durationSec: 1.8, type: 'harp' },
];
fs.writeFileSync(path.join(outDir, 'gentle_harp.wav'), mixSequence(gentleHarp, 2.5));
console.log('✓ Created gentle_harp.wav');

// 6. Upbeat Kiosk Theme Song
const happyKioskSong = [
  { freq: 523.25, startSec: 0.00, durationSec: 0.6, type: 'marimba' },
  { freq: 659.25, startSec: 0.16, durationSec: 0.6, type: 'marimba' },
  { freq: 783.99, startSec: 0.32, durationSec: 0.6, type: 'marimba' },
  { freq: 880.00, startSec: 0.50, durationSec: 0.6, type: 'marimba' },
  { freq: 783.99, startSec: 0.68, durationSec: 0.6, type: 'marimba' },
  { freq: 987.77, startSec: 0.86, durationSec: 0.7, type: 'marimba' },
  { freq: 1046.5, startSec: 1.05, durationSec: 1.6, type: 'marimba' },
];
fs.writeFileSync(path.join(outDir, 'happy_kiosk_song.wav'), mixSequence(happyKioskSong, 2.7));
console.log('✓ Created happy_kiosk_song.wav');

// 7. NEW: Nevada (Slowed + Reverb) - Vicetone Melodic Drop
// Famous iconic drop: B4 -> D5 -> E5 -> G5 -> F#5 -> E5 -> D5 -> B4 -> A4 -> B4
// Slowed tempo with lush warm chords
const nevadaSlowed = [
  // Bass roots
  { freq: 164.81, startSec: 0.00, durationSec: 2.2, type: 'slowed_synth' }, // E3
  { freq: 130.81, startSec: 1.80, durationSec: 2.0, type: 'slowed_synth' }, // C3
  // Lead melody hook
  { freq: 493.88, startSec: 0.00, durationSec: 0.35, type: 'slowed_synth' }, // B4
  { freq: 587.33, startSec: 0.28, durationSec: 0.35, type: 'slowed_synth' }, // D5
  { freq: 659.25, startSec: 0.56, durationSec: 0.55, type: 'slowed_synth' }, // E5
  { freq: 783.99, startSec: 0.95, durationSec: 0.45, type: 'slowed_synth' }, // G5
  { freq: 739.99, startSec: 1.35, durationSec: 0.45, type: 'slowed_synth' }, // F#5
  { freq: 659.25, startSec: 1.75, durationSec: 0.45, type: 'slowed_synth' }, // E5
  { freq: 587.33, startSec: 2.15, durationSec: 0.45, type: 'slowed_synth' }, // D5
  { freq: 493.88, startSec: 2.55, durationSec: 0.55, type: 'slowed_synth' }, // B4
  { freq: 440.00, startSec: 2.95, durationSec: 0.45, type: 'slowed_synth' }, // A4
  { freq: 493.88, startSec: 3.35, durationSec: 1.60, type: 'slowed_synth' }, // B4
];
fs.writeFileSync(path.join(outDir, 'nevada_slowed.wav'), mixSequence(nevadaSlowed, 5.0));
console.log('✓ Created nevada_slowed.wav');

// 8. NEW: In Another Life - Emotional Acoustic Piano Theme
// "In another life, I would make you stay..."
// Emotional ascending piano chords and melody
const inAnotherLife = [
  // Left hand piano chords
  { freq: 174.61, startSec: 0.00, durationSec: 2.2, type: 'piano' }, // F3
  { freq: 261.63, startSec: 0.00, durationSec: 2.2, type: 'piano' }, // C4
  { freq: 146.83, startSec: 1.80, durationSec: 2.2, type: 'piano' }, // D3
  { freq: 220.00, startSec: 1.80, durationSec: 2.2, type: 'piano' }, // A3
  // Melody hook
  { freq: 440.00, startSec: 0.00, durationSec: 0.40, type: 'piano' }, // A4
  { freq: 523.25, startSec: 0.32, durationSec: 0.40, type: 'piano' }, // C5
  { freq: 698.46, startSec: 0.65, durationSec: 0.70, type: 'piano' }, // F5
  { freq: 659.25, startSec: 1.25, durationSec: 0.50, type: 'piano' }, // E5
  { freq: 587.33, startSec: 1.65, durationSec: 0.50, type: 'piano' }, // D5
  { freq: 523.25, startSec: 2.05, durationSec: 0.60, type: 'piano' }, // C5
  { freq: 440.00, startSec: 2.55, durationSec: 0.50, type: 'piano' }, // A4
  { freq: 523.25, startSec: 2.95, durationSec: 0.50, type: 'piano' }, // C5
  { freq: 587.33, startSec: 3.35, durationSec: 1.80, type: 'piano' }, // D5
];
fs.writeFileSync(path.join(outDir, 'in_another_life.wav'), mixSequence(inAnotherLife, 5.2));
console.log('✓ Created in_another_life.wav');

// 9. NEW: Wild Flower (Wildflower) - Blooming Acoustic Picking
// Iconic acoustic guitar / kalimba picking motif
const wildFlower = [
  // Acoustic roots
  { freq: 164.81, startSec: 0.00, durationSec: 2.2, type: 'guitar' }, // E3
  { freq: 220.00, startSec: 1.90, durationSec: 2.0, type: 'guitar' }, // A3
  // Fingerpicking melody
  { freq: 415.30, startSec: 0.00, durationSec: 0.35, type: 'guitar' }, // G#4
  { freq: 493.88, startSec: 0.25, durationSec: 0.35, type: 'guitar' }, // B4
  { freq: 659.25, startSec: 0.50, durationSec: 0.65, type: 'guitar' }, // E5
  { freq: 622.25, startSec: 0.95, durationSec: 0.45, type: 'guitar' }, // D#5
  { freq: 493.88, startSec: 1.30, durationSec: 0.40, type: 'guitar' }, // B4
  { freq: 415.30, startSec: 1.65, durationSec: 0.40, type: 'guitar' }, // G#4
  { freq: 369.99, startSec: 1.95, durationSec: 0.35, type: 'guitar' }, // F#4
  { freq: 415.30, startSec: 2.25, durationSec: 0.45, type: 'guitar' }, // G#4
  { freq: 493.88, startSec: 2.65, durationSec: 0.50, type: 'guitar' }, // B4
  { freq: 659.25, startSec: 3.05, durationSec: 1.80, type: 'guitar' }, // E5
];
fs.writeFileSync(path.join(outDir, 'wild_flower.wav'), mixSequence(wildFlower, 4.9));
console.log('✓ Created wild_flower.wav');

// 10. NEW: បងក្រ (Bong Kror - Khmer Traditional Classic Melody)
// Iconic Cambodian Pentatonic melody on Roneat Ek (រនាតឯក) & gentle acoustic chimes
// D4 -> F4 -> G4 -> A4 -> C5 -> D5 -> C5 -> A4 -> G4 -> F4 -> D4
const bongKror = [
  // Traditional root
  { freq: 146.83, startSec: 0.00, durationSec: 2.4, type: 'roneat' }, // D3
  { freq: 196.00, startSec: 2.00, durationSec: 2.4, type: 'roneat' }, // G3
  // Roneat Ek Lead Melody
  { freq: 293.66, startSec: 0.00, durationSec: 0.45, type: 'roneat' }, // D4
  { freq: 349.23, startSec: 0.32, durationSec: 0.45, type: 'roneat' }, // F4
  { freq: 392.00, startSec: 0.65, durationSec: 0.55, type: 'roneat' }, // G4
  { freq: 440.00, startSec: 1.05, durationSec: 0.65, type: 'roneat' }, // A4
  { freq: 523.25, startSec: 1.55, durationSec: 0.55, type: 'roneat' }, // C5
  { freq: 587.33, startSec: 2.00, durationSec: 0.85, type: 'roneat' }, // D5
  { freq: 523.25, startSec: 2.65, durationSec: 0.50, type: 'roneat' }, // C5
  { freq: 440.00, startSec: 3.05, durationSec: 0.50, type: 'roneat' }, // A4
  { freq: 392.00, startSec: 3.45, durationSec: 0.55, type: 'roneat' }, // G4
  { freq: 349.23, startSec: 3.85, durationSec: 0.50, type: 'roneat' }, // F4
  { freq: 293.66, startSec: 4.25, durationSec: 2.00, type: 'roneat' }, // D4
];
fs.writeFileSync(path.join(outDir, 'bong_kror.wav'), mixSequence(bongKror, 6.3));
console.log('✓ Created bong_kror.wav');

// Copy all audio files to scripts/
const scriptsDir = path.join(__dirname);
const allFiles = [
  'welcome_melody.wav',
  'success_fanfare.wav',
  'campus_bell.wav',
  'crystal_ding.wav',
  'gentle_harp.wav',
  'happy_kiosk_song.wav',
  'nevada_slowed.wav',
  'in_another_life.wav',
  'wild_flower.wav',
  'bong_kror.wav',
];
for (const file of allFiles) {
  fs.copyFileSync(path.join(outDir, file), path.join(scriptsDir, file));
}
console.log(`✓ All ${allFiles.length} audio files copied to scripts/`);
console.log('All 10 melodic songs and audio files generated successfully!');
