import { getSettings, subscribeSettings } from "./settings";

/**
 * Minimal synthetic audio layer using Web Audio API. No external files — we
 * generate every sound effect on the fly from oscillators + noise bursts so
 * the bundle stays tiny. All effects respect the user's current settings.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicStop: (() => void) | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = getSettings().masterVolume;
  masterGain.connect(ctx.destination);
  return ctx;
}

subscribeSettings((s) => {
  if (masterGain) masterGain.gain.value = s.masterVolume;
  if (!s.musicEnabled && musicStop) {
    musicStop();
    musicStop = null;
  }
});

function withContext<T>(fn: (c: AudioContext, m: GainNode) => T): T | null {
  const c = ensureContext();
  if (!c || !masterGain) return null;
  // Autoplay policies require a user gesture before the context can run.
  if (c.state === "suspended") {
    c.resume().catch(() => undefined);
  }
  return fn(c, masterGain);
}

function playTone(opts: {
  freq: number;
  type?: OscillatorType;
  duration?: number;
  attack?: number;
  release?: number;
  volume?: number;
  sweepTo?: number;
}) {
  if (!getSettings().sfxEnabled) return;
  withContext((c, master) => {
    const { freq, type = "sine", duration = 0.2, attack = 0.005, release = 0.1, volume = 0.5, sweepTo } = opts;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, sweepTo), c.currentTime + duration);
    }
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + attack);
    gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + duration + release);
    osc.connect(gain).connect(master);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration + release + 0.02);
  });
}

function playNoiseBurst(opts: { duration?: number; volume?: number; filterFreq?: number }) {
  if (!getSettings().sfxEnabled) return;
  withContext((c, master) => {
    const { duration = 0.3, volume = 0.4, filterFreq = 2000 } = opts;
    const bufSize = Math.floor(c.sampleRate * duration);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.connect(filter).connect(gain).connect(master);
    src.start();
    src.stop(c.currentTime + duration);
  });
}

export const sfx = {
  click: () => playTone({ freq: 660, type: "triangle", duration: 0.06, volume: 0.2 }),
  shot: () =>
    playTone({ freq: 1200, sweepTo: 250, type: "square", duration: 0.25, volume: 0.3 }),
  miss: () => playNoiseBurst({ duration: 0.35, volume: 0.28, filterFreq: 1800 }),
  hit: () => {
    playNoiseBurst({ duration: 0.5, volume: 0.5, filterFreq: 3200 });
    playTone({ freq: 180, sweepTo: 55, type: "sawtooth", duration: 0.45, volume: 0.35 });
  },
  sunk: () => {
    playNoiseBurst({ duration: 0.7, volume: 0.6, filterFreq: 1200 });
    playTone({ freq: 110, sweepTo: 40, type: "sawtooth", duration: 0.6, volume: 0.45 });
    setTimeout(() => playTone({ freq: 220, sweepTo: 140, type: "sine", duration: 0.5, volume: 0.3 }), 200);
  },
  victory: () => {
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: "triangle", duration: 0.2, volume: 0.45 }), i * 120),
    );
  },
  defeat: () => {
    const seq = [392, 349, 294, 196];
    seq.forEach((f, i) =>
      setTimeout(() => playTone({ freq: f, type: "sine", duration: 0.3, volume: 0.4 }), i * 180),
    );
  },
  coin: () => {
    playTone({ freq: 988, type: "triangle", duration: 0.08, volume: 0.35 });
    setTimeout(() => playTone({ freq: 1319, type: "triangle", duration: 0.12, volume: 0.35 }), 60);
  },
};

/**
 * Start the ambient loop. Returns a disposer. Safe to call multiple times —
 * subsequent calls are a no-op while a loop is already running.
 */
export function startMusic(): void {
  if (!getSettings().musicEnabled) return;
  if (musicStop) return;
  const result = withContext((c, master) => {
    const musicGain = c.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(master);

    // Two slowly-detuning pads + a pentatonic melody loop.
    const pad1 = c.createOscillator();
    pad1.type = "sine";
    pad1.frequency.value = 110;
    const pad2 = c.createOscillator();
    pad2.type = "sine";
    pad2.frequency.value = 165.5;
    pad1.connect(musicGain);
    pad2.connect(musicGain);
    pad1.start();
    pad2.start();

    // Melodic sprinkle
    const notes = [523.25, 659.25, 784, 1046.5, 784, 659.25];
    let step = 0;
    const melodyId = setInterval(() => {
      if (!getSettings().musicEnabled) return;
      const n = notes[step % notes.length];
      step += 1;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = n;
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.07, c.currentTime + 0.05);
      g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.6);
      o.connect(g).connect(musicGain);
      o.start();
      o.stop(c.currentTime + 0.8);
    }, 900);

    return () => {
      clearInterval(melodyId);
      try {
        pad1.stop();
        pad2.stop();
      } catch {
        /* already stopped */
      }
      musicGain.disconnect();
    };
  });
  if (result) musicStop = result;
}

export function stopMusic(): void {
  if (musicStop) {
    musicStop();
    musicStop = null;
  }
}
