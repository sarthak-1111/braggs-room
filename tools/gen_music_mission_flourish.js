// gen_music_mission_flourish.js: the "identified" flourish for a correct mission verdict.
// Provenance: written by CLAD's /build-music skill during the stage-2 build. It needs the CLAD plugin
// installed (the require path below is machine-specific) and writes to Assets/GeneratedSFX.
//   MissionFlourish - a rising three-note chime phrase (~1.5 s), the same bell family as the spot
//   chimes so it reads as "the instrument" celebrating, not a game jingle. Each run picks a fresh
//   key and voicing (variety mandate); the choice is logged so a liked take can be pinned.
const path = require('path');
const fs = require('fs');
const m = require('C:/Users/NEDO-WS4/.claude/plugins/cache/ls-extensions/ls-clad/1.0.0/skills/build-music/tools');

const PROJECT_ASSETS_SFX = 'D:/SPECS-hn/braggs-room/Assets/GeneratedSFX';
fs.mkdirSync(PROJECT_ASSETS_SFX, { recursive: true });
const SR = 44100;

// Fresh pick per run: key root and the shape of the rising phrase (all three notes are chord tones,
// so the phrase is consonant whatever the key).
const roots = ['C5', 'D5', 'E5', 'F5', 'G5'];
const shapes = [
  { name: 'triad', degrees: [0, 4, 7] },      // root, third, fifth
  { name: 'open', degrees: [0, 7, 12] },      // root, fifth, octave
  { name: 'sixth', degrees: [0, 4, 9] },      // root, third, sixth
];
const root = roots[Math.floor(Math.random() * roots.length)];
const shape = shapes[Math.floor(Math.random() * shapes.length)];
const r = m.music_theory.noteToMidi(root);
const notes = shape.degrees.map((d) => r + d);
console.log('flourish', JSON.stringify({ root, shape: shape.name, notes }));

const bpm = 120; // 1 beat = 0.5 s; notes land at 0, 0.16 and 0.34 s, the last one rings out
const times = [0, 0.32, 0.68];
const bellEv = notes.map((n, i) => ({ time: times[i], beats: i === 2 ? 2.2 : 0.8, value: n, velocity: 96 + i * 8 }));
// A soft vibraphone an octave below doubles the last note so the landing feels settled.
const vibEv = [{ time: times[2], beats: 2.0, value: notes[2] - 12, velocity: 70 }];

const out = m.render([
  m.track('bell', 'bell', bellEv, { quantize: 'strict', fx: { hpf: 300, reverb: 'mediumRoom', gain: 0.6 } }),
  m.track('vib', 'vibraphone', vibEv, { quantize: 'strict', fx: { hpf: 200, lpf: 4000, reverb: 'mediumRoom', gain: 0.35 } }),
], { bpm, duration: 2.2 });

// Trim to ~1.6 s with a smooth fade from 1.1 s, peak-normalise to -1 dBFS, keep stereo.
const n = Math.floor(1.6 * SR);
const f0 = Math.floor(1.1 * SR);
const L = new Float32Array(n);
const R = new Float32Array(n);
let peak = 0;
for (let i = 0; i < n; i++) {
  let g = 1;
  if (i >= f0) g = Math.pow(1 - (i - f0) / (n - f0), 2);
  L[i] = (out.left[i] || 0) * g;
  R[i] = (out.right[i] || 0) * g;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const k = peak > 0 ? Math.pow(10, -1 / 20) / peak : 1;
for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
m.WavBuilder.write({ left: L, right: R }, path.join(PROJECT_ASSETS_SFX, 'MissionFlourish.wav'));
console.log('peak before normalise', peak.toFixed(3));
