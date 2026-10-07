/**
 * Nature soundscape under the story narration: wind, sea, rain, fire, crickets,
 * birds… all synthesized live with the Web Audio API (filtered noise and a few
 * oscillators), so it adds nothing to download and works offline. No musical
 * instrument: only the sounds of the places the story passes through.
 *
 * `sceneMix` decides which sounds a scene has; `Ambience` plays and crossfades them.
 */
import type { Ground, Motif, Scene, Sky } from '../data/types';

export const LAYERS = ['wind', 'sea', 'water', 'rain', 'thunder', 'fire', 'night', 'birds', 'leaves', 'cave'] as const;
export type Layer = (typeof LAYERS)[number];
/** Loudness of each sound, 0 to 1. */
export type Mix = Partial<Record<Layer, number>>;

const GROUND: Record<Ground, Mix> = {
  desert: { wind: 0.5 },
  sea: { sea: 0.9, wind: 0.25 },
  mountains: { wind: 0.7 },
  valley: { wind: 0.25, birds: 0.25 },
  garden: { birds: 0.45, leaves: 0.45 },
  city: { wind: 0.15 },
  river: { water: 0.8 },
  plain: { wind: 0.4 },
  cave: { cave: 0.85 },
  none: { wind: 0.1 },
};

const SKY: Record<Sky, Mix> = {
  dawn: { birds: 0.45 },
  day: {},
  dusk: { wind: 0.2 },
  night: { night: 0.55 },
  storm: { rain: 0.8, thunder: 0.8, wind: 0.65 },
};

const MOTIF: Partial<Record<Motif, Mix>> = {
  rain: { rain: 0.75 },
  'dark-clouds': { wind: 0.45 },
  lightning: { thunder: 0.8 },
  wind: { wind: 0.8 },
  flood: { water: 0.9, rain: 0.6, sea: 0.5 },
  'sea-split': { sea: 0.9, wind: 0.5 },
  ark: { sea: 0.6 },
  boat: { sea: 0.6 },
  'big-fish': { sea: 0.7 },
  spring: { water: 0.5 },
  fire: { fire: 0.85 },
  lamp: { fire: 0.25 },
  palm: { leaves: 0.35 },
  palms: { leaves: 0.4 },
  tree: { leaves: 0.4 },
  birds: { birds: 0.7 },
  hoopoe: { birds: 0.7 },
  well: { cave: 0.3 },
  'cave-mouth': { cave: 0.6 },
  prison: { cave: 0.5 },
};

/** The sounds of a scene: the loudest request wins for each sound. */
export function sceneMix(scene: Pick<Scene, 'sky' | 'ground' | 'motifs'>): Mix {
  const mix: Mix = {};
  for (const part of [GROUND[scene.ground], SKY[scene.sky], ...(scene.motifs ?? []).map((m) => MOTIF[m] ?? {})]) {
    for (const [layer, level] of Object.entries(part) as [Layer, number][]) mix[layer] = Math.max(mix[layer] ?? 0, level);
  }
  // Under a storm sky nothing sings; at night the garden sleeps.
  if (scene.sky === 'storm') delete mix.birds;
  if (scene.sky === 'night') {
    delete mix.birds;
    if (mix.leaves) mix.leaves *= 0.5;
  }
  // Crickets are an open-air sound: not at sea, not in a cave, not in the rain.
  if (scene.ground === 'sea' || scene.ground === 'cave' || mix.rain) delete mix.night;
  return mix;
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = 'white' | 'pink' | 'brown';

/** A seamless loop of noise: its tail is cross-faded into its start. */
function noiseBuffer(ctx: BaseAudioContext, kind: Kind, seconds: number, rand: () => number): AudioBuffer {
  const rate = ctx.sampleRate;
  const n = Math.floor(rate * seconds);
  const fade = Math.floor(rate * 0.3);
  const raw = new Float32Array(n + fade);
  let [b0, b1, b2, b3, b4, b5, b6, last] = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < raw.length; i++) {
    const w = rand() * 2 - 1;
    if (kind === 'white') raw[i] = w * 0.5;
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      raw[i] = last * 3.5;
    }
  }
  const buffer = ctx.createBuffer(1, n, rate);
  const data = buffer.getChannelData(0);
  data.set(raw.subarray(0, n));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] = raw[i] * Math.sqrt(t) + raw[n + i] * Math.sqrt(1 - t);
  }
  return buffer;
}

/** Loudness correction (measured by rendering each sound alone) so that all sit at a similar level. */
const TRIM: Record<Layer, number> = {
  wind: 0.75,
  sea: 0.7,
  water: 0.87,
  rain: 0.26,
  thunder: 0.5,
  fire: 0.85,
  night: 1.1,
  birds: 1.3,
  leaves: 1.3,
  cave: 1.15,
};

/** Overall volume under the voice: about 14 dB below it. */
export const AMBIENCE_LEVEL = 0.5;

export class Ambience {
  private readonly rand: () => number;
  private readonly master: GainNode;
  private readonly gains = {} as Record<Layer, GainNode>;
  private readonly levels: Record<Layer, number> = { wind: 0, sea: 0, water: 0, rain: 0, thunder: 0, fire: 0, night: 0, birds: 0, leaves: 0, cave: 0 };
  private readonly events: Partial<Record<Layer, (from: number, until: number) => void>> = {};
  private readonly sources: AudioScheduledSourceNode[] = [];
  /** The value each fading parameter is heading to, to start the next fade from it. */
  private readonly last = new Map<AudioParam, number>();
  private noise!: Record<Kind, AudioBuffer>;
  private click!: AudioBuffer;
  private scheduled = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private built = false;

  constructor(
    readonly ctx: BaseAudioContext,
    destination: AudioNode = ctx.destination,
    seed = 7,
  ) {
    this.rand = seeded(seed);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(destination);
    for (const layer of LAYERS) {
      this.gains[layer] = ctx.createGain();
      this.gains[layer].gain.value = 0;
      this.gains[layer].connect(this.master);
    }
  }

  /** Builds the sounds. In real time, also keeps scheduling their random events. */
  start(realtime = true) {
    if (!this.built) {
      this.built = true;
      this.build();
    }
    if (realtime && !this.timer) {
      this.tick(8);
      this.timer = setInterval(() => this.tick(8), 2000);
    }
  }

  /** Fades to a scene's sounds, starting at `at` (seconds on the audio clock; now by default). */
  setMix(mix: Mix, fade = 2.5, at = this.ctx.currentTime) {
    for (const layer of LAYERS) {
      this.levels[layer] = mix[layer] ?? 0;
      this.ramp(this.gains[layer].gain, this.levels[layer] * TRIM[layer], fade, at);
    }
  }

  /** Overall volume, 0 to 1. */
  setLevel(level: number, fade = 1, at = this.ctx.currentTime) {
    this.ramp(this.master.gain, level, fade, at);
  }

  /** Schedules random events (thunder, crackles, bird calls, drips) `horizon` seconds ahead. */
  tick(horizon: number) {
    const from = Math.max(this.scheduled, this.ctx.currentTime);
    const until = this.ctx.currentTime + horizon;
    if (until <= from) return;
    for (const layer of LAYERS) if (this.levels[layer] > 0.02) this.events[layer]?.(from, until);
    this.scheduled = until;
  }

  dispose(fade = 1) {
    clearInterval(this.timer);
    this.timer = undefined;
    this.setLevel(0, fade);
    const stopAt = this.ctx.currentTime + fade + 0.1;
    for (const s of this.sources) {
      try {
        s.stop(stopAt);
      } catch {
        /* never started */
      }
    }
  }

  private ramp(param: AudioParam, value: number, fade: number, at: number) {
    const from = this.last.get(param) ?? param.value;
    param.cancelScheduledValues(at);
    param.setValueAtTime(from, at);
    param.linearRampToValueAtTime(value, at + Math.max(fade, 0.01));
    this.last.set(param, value);
  }

  // --- building blocks ---------------------------------------------------------------

  private loop(kind: Kind, offset = this.rand() * 6): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise[kind];
    s.loop = true;
    s.start(0, offset);
    this.sources.push(s);
    return s;
  }

  private filter(type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    return f;
  }

  private gain(value: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return g;
  }

  /** A slow oscillation added to `target`: `depth` around its current value. */
  private lfo(frequency: number, depth: number, target: AudioParam, type: OscillatorType = 'sine') {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = frequency;
    const g = this.gain(depth);
    o.connect(g);
    g.connect(target);
    o.start();
    this.sources.push(o);
  }

  private chain(...nodes: AudioNode[]) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  }

  /** A short burst of noise or a tone, shaped by an envelope, at time `t`. */
  private blip(out: AudioNode, t: number, o: { type?: OscillatorType; from: number; to?: number; peak: number; attack?: number; decay: number }) {
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.from, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.decay);
    const env = this.gain(0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(o.peak, t + (o.attack ?? 0.006));
    env.gain.exponentialRampToValueAtTime(0.0005, t + o.decay);
    this.chain(osc, env, out);
    osc.start(t);
    osc.stop(t + o.decay + 0.05);
  }

  private build() {
    const { ctx, rand } = this;
    this.noise = { white: noiseBuffer(ctx, 'white', 4, rand), pink: noiseBuffer(ctx, 'pink', 8, rand), brown: noiseBuffer(ctx, 'brown', 8, rand) };
    // A tiny decaying noise grain: the building block of crackles.
    const grain = Math.floor(ctx.sampleRate * 0.05);
    this.click = ctx.createBuffer(1, grain, ctx.sampleRate);
    const cd = this.click.getChannelData(0);
    for (let i = 0; i < grain; i++) cd[i] = (rand() * 2 - 1) * Math.exp((-6 * i) / grain);

    // Wind: low rumble whose pitch and strength drift slowly.
    {
      const band = this.filter('bandpass', 480, 0.7);
      const swell = this.gain(0.7);
      this.chain(this.loop('pink'), band, swell, this.gains.wind);
      this.lfo(0.05, 200, band.frequency);
      this.lfo(0.11, 0.3, swell.gain);
    }
    // Sea: waves that rise and fall, with a hiss of foam on top.
    {
      const body = this.gain(0.5);
      this.chain(this.loop('pink'), this.filter('lowpass', 1100), this.filter('highpass', 120), body, this.gains.sea);
      this.lfo(0.1, 0.4, body.gain);
      const foam = this.gain(0.06);
      this.chain(this.loop('white'), this.filter('bandpass', 2800, 0.5), foam, this.gains.sea);
      this.lfo(0.1, 0.05, foam.gain);
    }
    // Water: a stream's babble, from two bands that flicker.
    {
      const low = this.gain(0.5);
      this.chain(this.loop('pink'), this.filter('bandpass', 1300, 0.9), low, this.gains.water);
      this.lfo(6.5, 0.12, low.gain);
      const high = this.gain(0.18);
      this.chain(this.loop('white'), this.filter('bandpass', 3600, 1.1), high, this.gains.water);
      this.lfo(10.5, 0.08, high.gain);
    }
    // Rain: steady shower.
    {
      const a = this.gain(0.55);
      this.chain(this.loop('white'), this.filter('highpass', 800), this.filter('lowpass', 8000), a, this.gains.rain);
      const b = this.gain(0.3);
      this.chain(this.loop('pink'), this.filter('bandpass', 2200, 0.5), b, this.gains.rain);
      this.lfo(0.17, 0.08, a.gain);
    }
    // Fire: a low roar, plus crackles (see events).
    {
      const roar = this.gain(0.5);
      this.chain(this.loop('pink'), this.filter('bandpass', 420, 0.5), roar, this.gains.fire);
      this.lfo(0.4, 0.15, roar.gain);
    }
    // Night: two crickets, chirping in bursts.
    for (const [carrier, pulse, burst] of [
      [4350, 31, 0.9],
      [4720, 27, 0.7],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = carrier;
      const chirp = this.gain(0.5);
      const phrase = this.gain(0.5);
      const level = this.gain(0.045);
      this.chain(o, chirp, phrase, level, this.gains.night);
      this.lfo(pulse, 0.5, chirp.gain);
      this.lfo(burst, 0.5, phrase.gain);
      o.start();
      this.sources.push(o);
    }
    // Leaves: a soft rustle.
    {
      const rustle = this.gain(0.18);
      this.chain(this.loop('pink'), this.filter('highpass', 2200), this.filter('lowpass', 7000), rustle, this.gains.leaves);
      this.lfo(0.21, 0.1, rustle.gain);
      this.lfo(0.37, 0.06, rustle.gain);
    }
    // Cave: a hollow room tone, plus echoing drips (see events).
    {
      const hollow = this.gain(0.35);
      this.chain(this.loop('pink'), this.filter('bandpass', 260, 0.6), hollow, this.gains.cave);
    }

    // --- random events ---------------------------------------------------------------
    const every = (min: number, max: number, fn: (t: number) => void) => {
      let next = ctx.currentTime + min + rand() * (max - min);
      return (from: number, until: number) => {
        // A sound that was silent for a while must not fire all its missed events at once.
        if (next < from) next = from + min + rand() * (max - min);
        while (next < until) {
          fn(Math.max(next, ctx.currentTime));
          next += min + rand() * (max - min);
        }
      };
    };

    this.events.fire = every(0.07, 0.4, (t) => {
      const s = ctx.createBufferSource();
      s.buffer = this.click;
      s.playbackRate.value = 0.6 + rand() * 1.8;
      const band = this.filter('bandpass', 1200 + rand() * 4300, 1.8);
      const g = this.gain(0.15 + rand() * 0.5);
      this.chain(s, band, g, this.gains.fire);
      s.start(t);
    });

    this.events.thunder = every(9, 22, (t) => {
      const rumble = ctx.createBufferSource();
      rumble.buffer = this.noise.pink;
      rumble.loop = true;
      const low = this.filter('lowpass', 240 + rand() * 120);
      const env = this.gain(0);
      const length = 3 + rand() * 3;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1.6, t + 0.35);
      env.gain.exponentialRampToValueAtTime(0.001, t + length);
      this.chain(rumble, low, env, this.gains.thunder);
      rumble.start(t, rand() * 5);
      rumble.stop(t + length + 0.1);
      if (rand() < 0.6) {
        const crack = ctx.createBufferSource();
        crack.buffer = this.click;
        crack.playbackRate.value = 0.5;
        const g = this.gain(0.9);
        this.chain(crack, this.filter('highpass', 900), g, this.gains.thunder);
        crack.start(t);
      }
    });

    this.events.birds = every(1.4, 4.8, (t) => {
      const f0 = 2300 + rand() * 1900;
      const calls = 1 + Math.floor(rand() * 4);
      for (let i = 0; i < calls; i++) {
        const at = t + i * (0.11 + rand() * 0.07);
        const to = f0 * (0.75 + rand() * 0.8);
        this.blip(this.gains.birds, at, { from: f0, to, peak: 0.1 + rand() * 0.1, decay: 0.07 + rand() * 0.07 });
        this.blip(this.gains.birds, at, { from: f0 * 2, to: to * 2, peak: 0.025, decay: 0.07 });
      }
    });

    {
      // Drips: a drop and its echoes.
      const bus = this.gain(1);
      const echo = ctx.createDelay(1);
      echo.delayTime.value = 0.27;
      const feedback = this.gain(0.4);
      this.chain(bus, echo, feedback, echo);
      bus.connect(this.gains.cave);
      echo.connect(this.gains.cave);
      this.events.cave = every(2.2, 6.5, (t) => {
        const f = 700 + rand() * 700;
        this.blip(bus, t, { from: f, to: f * 1.7, peak: 0.12, attack: 0.004, decay: 0.12 });
      });
    }
  }
}

/** The browser's audio engine, created on demand (it needs a tap on iOS). */
export function createAudioContext(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    // iOS mutes Web Audio when the silent switch is on, unless the page declares itself as media playback.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    return AC ? new AC() : null;
  } catch {
    return null;
  }
}
