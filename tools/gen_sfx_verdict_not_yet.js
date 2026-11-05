// gen_sfx_verdict_not_yet.js: the soft, low "not yet" tone for a wrong or insufficient verdict.
// Provenance: written by CLAD's /build-sfx skill during the stage-2 build. It needs the CLAD plugin
// installed (set CLAD_PLUGIN_DIR if it isn't in the default Claude Code plugin cache) and writes to Assets/GeneratedSFX.
//   VerdictNotYet - two gentle low mallet tones stepping down (~0.5 s). Deliberately not the
//   uiError buzz: a wrong verdict is part of learning, so the cue says "look again", not "error".
const path = require('path');
const fs = require('fs');
const audio = require(path.join(process.env.CLAD_PLUGIN_DIR || path.join(require('os').homedir(), '.claude/plugins/cache/ls-extensions/ls-clad/1.0.0'), 'skills/build-sfx/tools'));

const PROJECT_ASSETS_SFX = path.join(__dirname, '..', 'Assets', 'GeneratedSFX');
fs.mkdirSync(PROJECT_ASSETS_SFX, { recursive: true });
const SR = audio.SAMPLE_RATE;

// Small per-run variation (sibling takes, not clones): base pitch and step interval.
const base = 300 + Math.random() * 40;                 // ~D4-E4
const step = Math.pow(2, -(3 + Math.floor(Math.random() * 2)) / 12); // down a minor or major third
console.log('not-yet', JSON.stringify({ base: base.toFixed(1), step: step.toFixed(3) }));

function softTone(freq, dur, level) {
  // Sine body with a whisper of FM for a woody, rounded mallet; slow-ish attack keeps it gentle.
  const body = audio.osc_models.fmOperator(freq, dur, 1, 0.6, (t) => Math.exp(-9 * t));
  audio.adsrExp(body, 0.012, 0.08, 0.35, dur - 0.1, 3);
  const sub = audio.sine(freq / 2, dur, 0.35);
  audio.adsrExp(sub, 0.02, 0.1, 0.3, dur - 0.13, 3);
  const mix = audio.mix([body, sub], [0.8, 0.35]);
  for (let i = 0; i < mix.length; i++) mix[i] *= level;
  return mix;
}

const out = new Float32Array(Math.floor(0.62 * SR));
audio.addInto(out, softTone(base, 0.28, 0.9), 0, 1.0);
audio.addInto(out, softTone(base * step, 0.36, 0.8), Math.floor(0.17 * SR), 1.0);
audio.fadeOut(out, 0.06);
const result = audio.mix_bus.applyFx(out, { hpf: 90, lpf: 1600, reverb: 'smallRoom', gain: 0.8 });
audio.mix_bus.masterChain(result, { normalize: 'peak' });
audio.WavBuilder.write(result, path.join(PROJECT_ASSETS_SFX, 'VerdictNotYet.wav'));
console.log('written');
