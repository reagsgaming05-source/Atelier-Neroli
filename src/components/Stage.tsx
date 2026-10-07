import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Focus, Ground, Motif, Sky } from '../data/types';
import {
  cameraTransform,
  effectsFor,
  layerZoom,
  planPainting,
  planShots,
  rng,
  shotCount,
  type Box,
  type Effect,
  type Shot,
  type Stage as StageSize,
} from '../lib/direction';
import { SceneArt } from './SceneArt';

/** How much of the camera's movement each layer follows: the sky is far away, the foreground close. */
const PARALLAX = { sky: 0.5, land: 1, fx: 1.2, fore: 1.5 } as const;

const START: Shot = { x: 150, y: 190, k: 1.04 };

interface Slot {
  id: string;
  sig: string;
  seed: number;
  sky: Sky;
  ground: Ground;
  motifs: Motif[];
  /** The painted picture, when there is one (the drawn layers are then left out). */
  painting?: string;
}

/**
 * The film's camera. The picture is built in three layers that the camera crosses at
 * different speeds, with floating atmosphere in front. The camera never stops: it
 * glides from one framing to the next, and keeps gliding when the picture changes —
 * the new picture dissolves in over the old one, in the same shot, like a film.
 */
export function Stage({
  pictureKey,
  sky,
  ground,
  motifs = [],
  focus,
  seed,
  ms,
  playing,
  label,
  people = true,
  painting,
}: {
  /** Changes whenever another picture has to be shown. */
  pictureKey: string;
  sky: Sky;
  ground: Ground;
  motifs?: Motif[];
  /** What the camera should look at in this picture. */
  focus?: Focus;
  /** Makes the direction of this picture reproducible. */
  seed: number;
  /** How long the picture stays, to pace the camera. */
  ms: number;
  playing: boolean;
  label?: string;
  /** Show the silhouettes of ordinary people. */
  people?: boolean;
  /** URL of a painted picture that replaces the drawing. */
  painting?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<StageSize>({ w: 390, h: 520 });
  const signature = painting ?? `${sky}/${ground}/${[...motifs].sort().join('+')}`;
  const [slots, setSlots] = useState<Slot[]>([{ id: pictureKey, sig: signature, seed, sky, ground, motifs, painting }]);
  // The camera is a spring: it eases towards a target and keeps its speed when the target changes,
  // so that it glides from one framing to the next without ever stopping.
  const camRef = useRef<Shot>(START); // where it is heading
  const body = useRef({ x: START.x, y: START.y, k: START.k, vx: 0, vy: 0, vk: 0 });
  // A second spring in front of the first: the aim follows the target, the camera follows the aim, so a move
  // starts gently (no sudden kick) and ends gently.
  const aim = useRef({ x: START.x, y: START.y, k: START.k, vx: 0, vy: 0, vk: 0 });
  const layers = useRef<{ el: HTMLElement; factor: number }[]>([]);
  const [route, setRoute] = useState<Shot[]>([START]);
  const [step, setStep] = useState(0);
  const [leg, setLeg] = useState(3000);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth || 390, h: el.clientHeight || 520 });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(el);
    return () => watcher.disconnect();
  }, []);

  // Another picture: if it looks different, it dissolves in over the current one.
  useLayoutEffect(() => {
    setSlots((all) => (all.at(-1)!.sig === signature ? all : [...all, { id: pictureKey, sig: signature, seed, sky, ground, motifs, painting }].slice(-2)));
  }, [pictureKey]);

  // The painting of the picture on screen arrives late, or the look is changed: it takes the place of the drawing at once.
  useLayoutEffect(() => {
    setSlots((all) => {
      const last = all.at(-1)!;
      return last.id === pictureKey && last.painting !== painting ? [...all.slice(0, -1), { ...last, painting, sig: signature }] : all;
    });
  }, [painting]);

  // Once the old picture is covered, it goes.
  useEffect(() => {
    if (slots.length < 2) return;
    const t = window.setTimeout(() => setSlots((all) => all.slice(-1)), 1400);
    return () => clearTimeout(t);
  }, [slots.length, slots.at(-1)?.id]);

  // Where the objects of the picture are, so the camera can go and look at them; then the route.
  const shownId = slots.at(-1)!.id;
  useLayoutEffect(() => {
    const found: Box[] = [];
    root.current?.querySelectorAll<SVGGElement>(`[data-slot="${CSS.escape(shownId)}"] [data-m]`).forEach((g) => {
      try {
        const b = g.getBBox();
        const far = g.closest('[data-layer="sky"]') ? 0.7 : 1;
        found.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height, weight: Math.min(Math.sqrt(b.width * b.height), 70) * far, motif: g.dataset.m });
      } catch {
        /* not rendered (hidden tab): the camera falls back to the generic views */
      }
    });
    const planned = slots.at(-1)!.painting
      ? planPainting(Math.max(shotCount(ms, 5200), 2), seed, camRef.current)
      : planShots(found, Math.max(shotCount(ms), 2), seed, focus, camRef.current);
    setRoute(planned);
    setStep(0);
    // Moves between framings take most of the time available: the camera is always drifting.
    setLeg(Math.max(ms / Math.max(planned.length - 1, 1), 1800));
  }, [pictureKey, shownId, slots.at(-1)?.painting]);

  useEffect(() => {
    if (!playing || step >= route.length - 1) return;
    const t = window.setTimeout(() => {
      camRef.current = route[step + 1];
      setStep(step + 1);
    }, step === 0 ? 400 : leg);
    return () => clearTimeout(t);
  }, [playing, step, route, leg]);

  // Puts the camera's position on every layer, each moving by its own share (parallax).
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const paint = (time = 0) => {
    const b = body.current;
    // A breath of movement, so that even a held shot is alive.
    const focus = { x: b.x + Math.sin(time / 5200) * 2.4, y: b.y + Math.cos(time / 7100) * 1.7 };
    const zoom = b.k * (1 + 0.012 * Math.sin(time / 6100));
    for (const { el, factor } of layers.current) {
      const { tx, ty, k } = cameraTransform(sizeRef.current, focus, layerZoom(zoom, factor));
      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
    }
  };

  // The layers that exist now (the new picture's appear with it), placed at once.
  useLayoutEffect(() => {
    layers.current = [...(root.current?.querySelectorAll<HTMLElement>('.stage-layer') ?? [])].map((el) => ({ el, factor: Number(el.dataset.factor) }));
    paint(performance.now());
  }, [slots.map((x) => x.id).join('|'), size.w, size.h]);

  useEffect(() => {
    if (!playing) return;
    const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let last = performance.now();
    const damp = (current: number, target: number, speed: number, smooth: number, dt: number) => {
      // Critically damped spring (smooth damp): no overshoot, speed carried over from one target to the next.
      const omega = 2 / smooth;
      const x = omega * dt;
      const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      const change = current - target;
      const temp = (speed + omega * change) * dt;
      return { value: target + (change + temp) * decay, speed: (speed - omega * temp) * decay };
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const b = body.current;
      const t = camRef.current;
      const smooth = Math.min(Math.max((leg / 1000) * 0.3, 0.8), 2.4);
      const a = aim.current;
      if (still) {
        Object.assign(a, { x: t.x, y: t.y, k: t.k, vx: 0, vy: 0, vk: 0 });
        Object.assign(b, { x: t.x, y: t.y, k: t.k, vx: 0, vy: 0, vk: 0 });
      } else {
        const ax = damp(a.x, t.x, a.vx, smooth, dt);
        const ay = damp(a.y, t.y, a.vy, smooth, dt);
        const ak = damp(a.k, t.k, a.vk, smooth * 1.1, dt);
        Object.assign(a, { x: ax.value, y: ay.value, k: ak.value, vx: ax.speed, vy: ay.speed, vk: ak.speed });
        const x = damp(b.x, a.x, b.vx, smooth, dt);
        const y = damp(b.y, a.y, b.vy, smooth, dt);
        const k = damp(b.k, a.k, b.vk, smooth * 1.1, dt);
        Object.assign(b, { x: x.value, y: y.value, k: k.value, vx: x.speed, vy: y.speed, vk: k.speed });
      }
      paint(now);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, leg]);

  return (
    <div class="stage" ref={root} role="img" aria-label={label ?? 'Illustration'}>
      {slots.map((slot, i) => (
        <PictureLayers key={slot.id} slot={slot} fresh={i > 0} playing={playing} people={people} />
      ))}
      <div class="stage-grade" aria-hidden="true" />
    </div>
  );
}

function PictureLayers({ slot, fresh, playing, people }: { slot: Slot; fresh: boolean; playing: boolean; people: boolean }) {
  // Over a painting, the floating atmosphere stays but the drawn clouds would only be in the way.
  const effects = useMemo(() => effectsFor(slot).filter((e) => !slot.painting || e !== 'clouds'), [slot.sig]);
  if (slot.painting) {
    return (
      <div class={`stage-slot ${fresh ? 'stage-slot-in' : ''}`} data-slot={slot.id}>
        <div class="stage-layer" data-layer="land" data-factor={PARALLAX.land}>
          <img class="stage-painting" src={slot.painting} alt="" decoding="async" draggable={false} />
        </div>
        <div class={`stage-layer stage-fx ${playing ? '' : 'paused'}`} data-factor={PARALLAX.fx}>
          <Atmosphere effects={effects} seed={slot.seed} sky={slot.sky} />
        </div>
      </div>
    );
  }
  return (
    <div class={`stage-slot ${fresh ? 'stage-slot-in' : ''}`} data-slot={slot.id}>
      <div class="stage-layer" data-layer="sky" data-factor={PARALLAX.sky}>
        <SceneArt sky={slot.sky} ground={slot.ground} motifs={slot.motifs} layer="sky" paused={!playing} people={people} ambient />
      </div>
      <div class="stage-layer" data-layer="land" data-factor={PARALLAX.land}>
        <SceneArt sky={slot.sky} ground={slot.ground} motifs={slot.motifs} layer="land" paused={!playing} people={people} ambient />
      </div>
      <div class={`stage-layer stage-fx ${playing ? '' : 'paused'}`} data-factor={PARALLAX.fx}>
        <Atmosphere effects={effects} seed={slot.seed} sky={slot.sky} />
      </div>
      <div class="stage-layer" data-layer="fore" data-factor={PARALLAX.fore}>
        <SceneArt sky={slot.sky} ground={slot.ground} motifs={slot.motifs} layer="fore" paused={!playing} people={people} ambient />
      </div>
    </div>
  );
}

const COUNT: Record<Effect, number> = { dust: 16, fireflies: 11, embers: 14, sand: 9, mist: 3, rays: 3, leaves: 8, birds: 3, clouds: 4 };

/** Specks of light, mist, birds, embers… floating in front of the scene. */
function Atmosphere({ effects, seed, sky }: { effects: Effect[]; seed: number; sky: Sky }) {
  const rand = rng(seed ^ 0x9e3779b9);
  return (
    <>
      {effects.map((effect) => (
        <div key={effect} class={`fx fx-${effect} sky-${sky}`}>
          {Array.from({ length: COUNT[effect] }, (_, i) => {
            const base = rand();
            return (
              <i
                key={i}
                style={{
                  '--x': (rand() * 100).toFixed(1),
                  '--y': (effect === 'embers' ? 62 + rand() * 30 : effect === 'clouds' ? 4 + rand() * 38 : rand() * 100).toFixed(1),
                  '--s': (1.5 + base * 3.5).toFixed(1),
                  '--t': (effect === 'clouds' ? 70 + base * 60 : effect === 'sand' ? 1.4 + base * 1.6 : 7 + base * 9).toFixed(1),
                  '--d': (-rand() * 20).toFixed(1),
                  '--w': (20 + rand() * 40).toFixed(0),
                } as Record<string, string>}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}
