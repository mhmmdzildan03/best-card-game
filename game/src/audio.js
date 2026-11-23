// audio.js — every sound is synthesized with WebAudio oscillators in code.
// No audio files, no network. A mute toggle lives in the duel header.

let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.12) {
  const a = ac(); if (!a || muted) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type; osc.frequency.value = freq;
  const t0 = a.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  play() { tone(420, 0, 0.12, 'triangle'); tone(630, 0.07, 0.14, 'triangle'); },
  draw() { tone(880, 0, 0.07, 'sine', 0.06); },
  bond() { tone(523, 0, 0.12, 'sine'); tone(659, 0.08, 0.12, 'sine'); tone(784, 0.16, 0.2, 'sine'); },
  attack() { tone(180, 0, 0.16, 'sawtooth', 0.1); tone(120, 0.05, 0.2, 'sawtooth', 0.08); },
  hit() { tone(90, 0, 0.18, 'square', 0.1); },
  turn() { tone(520, 0, 0.09, 'triangle', 0.08); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.28, 'triangle', 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, 'triangle', 0.12)); },
};
