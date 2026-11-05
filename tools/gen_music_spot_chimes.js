// gen_music_spot_chimes.js: the two Bragg's Room spot chimes (pitched, bell-like, ~0.6 s).
// Provenance: written by CLAD's /build-music skill during the build. It needs the CLAD plugin installed
// (the require path below is machine-specific) and writes to Assets/GeneratedSFX.
//   SpotChimeFirst  - first sighting of a reflection: bright two-note rising bell (root + fifth).
//   SpotChimeRepeat - repeat sighting: one softer, darker bell note.
// Loudness difference is applied in the Lens (BraggsRoomSpotPool volume inputs); both files are peak-normalised.
const path = require('path');
const fs = require('fs');
const m = require('C:/Users/NEDO-WS4/.claude/plugins/cache/ls-extensions/ls-clad/1.0.0/skills/build-music/tools');

const PROJECT_ASSETS_SFX = 'D:/SPECS-hn/braggs-room/Assets/GeneratedSFX';
fs.mkdirSync(PROJECT_ASSETS_SFX, { recursive: true });
const SR = 44100;

function toMonoWithFade(stereo, totalSec, fadeStartSec) {
  const n = Math.floor(totalSec * SR);
  const out = new Float32Array(n);
  const f0 = Math.floor(fadeStartSec * SR);
  for (let i = 0; i < n; i++) {
    let v = 0.5 * ((stereo.left[i] || 0) + (stereo.right[i] || 0));
    if (i >= f0) {
      const t = (i - f0) / Math.max(1, n - f0);
      v *= Math.pow(1 - t, 2); // smooth fade so the tail ends cleanly
    }
    out[i] = v;
  }
  // peak-normalise to -1 dBFS
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = peak > 0 ? Math.pow(10, -1 / 20) / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= g;
  return { buf: out, peakBefore: peak };
}

const bpm = 120; // 1 beat = 0.5 s
const noteE6 = m.music_theory.noteToMidi('E6');
const noteB6 = m.music_theory.noteToMidi('B6');
const noteA5 = m.music_theory.noteToMidi('A5');

// First sighting: E6 then B6 0.09 s later (a bright open fifth), crisp bell, small room.
const firstEvents = [
  { time: 0, beats: 0.6, value: noteE6, velocity: 112 },
  { time: 0.18, beats: 0.6, value: noteB6, velocity: 104 },
];
const first = m.render([
  m.track('bell', 'bell', firstEvents, { quantize: 'strict', fx: { hpf: 300, reverb: 'smallRoom', gain: 0.6 } }),
], { bpm, duration: 1.2 });
const f = toMonoWithFade(first, 0.8, 0.45);
m.WavBuilder.write(f.buf, path.join(PROJECT_ASSETS_SFX, 'SpotChimeFirst.wav'));

// Repeat sighting: one softer, darker note (A5 vibraphone-like bell, low-passed).
const repeatEvents = [{ time: 0, beats: 0.5, value: noteA5, velocity: 80 }];
const rep = m.render([
  m.track('bell', 'vibraphone', repeatEvents, { quantize: 'strict', fx: { hpf: 250, lpf: 3200, reverb: 'smallRoom', gain: 0.6 } }),
], { bpm, duration: 1.0 });
const r = toMonoWithFade(rep, 0.6, 0.3);
m.WavBuilder.write(r.buf, path.join(PROJECT_ASSETS_SFX, 'SpotChimeRepeat.wav'));
console.log('peaks before normalise', f.peakBefore.toFixed(3), r.peakBefore.toFixed(3));
