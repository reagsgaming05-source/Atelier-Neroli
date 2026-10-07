import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Focus, Ground, Motif, Sky } from '../data/types';
import {
  cameraTransform,
  effectsFor,
  layerZoom,
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
}) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<StageSize>({ w: 390, h: 520 });
  const signature = `${sky}/${ground}/${[...motifs].sort().join('+')}`;
  const [slots, setSlots] = useState<Slot[]>([{ id: pictureKey, sig: signature, seed, sky, ground, motifs }]);
  const [cam, setCam] = useState<Shot>(START);
  const camRef = useRef<Shot>(START);
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
    setSlots((all) => (all.at(-1)!.sig === signature ? all : [...all, { id: pictureKey, sig: signature, seed, sky, ground, motifs }].slice(-2)));
  }, [pictureKey]);

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
    const planned = planShots(found, Math.max(shotCount(ms), 2), seed, focus, camRef.current);
    setRoute(planned);
    setStep(0);
    // Moves between framings take most of the time available: the camera is always drifting.
    setLeg(Math.max(ms / Math.max(planned.length - 1, 1), 1800));
  }, [pictureKey, shownId]);

  useEffect(() => {
    if (!playing || step >= route.length - 1) return;
    const t = window.setTimeout(() => {
      camRef.current = route[step + 1];
      setCam(route[step + 1]);
      setStep(step + 1);
    }, step === 0 ? 400 : leg);
    return () => clearTimeout(t);
  }, [playing, step, route, leg]);

  const style = (factor: number) => {
    const { tx, ty, k } = cameraTransform(size, cam, layerZoom(cam.k, factor));
    return {
      transform: `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${k.toFixed(3)})`,
      transitionDuration: `${Math.round(leg * 0.94)}ms`,
    };
  };

  return (
    <div class="stage" ref={root} role="img" aria-label={label ?? 'Illustration'}>
      {slots.map((slot, i) => (
        <PictureLayers key={slot.id} slot={slot} fresh={i > 0} playing={playing} style={style} />
      ))}
      <div class="stage-grade" aria-hidden="true" />
    </div>
  );
}

function PictureLayers({ slot, fresh, playing, style }: { slot: Slot; fresh: boolean; playing: boolean; style: (factor: number) => Record<string, string> }) {
  const effects = useMemo(() => effectsFor(slot), [slot.sig]);
  return (
    <div class={`stage-slot ${fresh ? 'stage-slot-in' : ''}`} data-slot={slot.id}>
      <div class="stage-layer" data-layer="sky" style={style(PARALLAX.sky)}>
        <SceneArt sky={slot.sky} ground={slot.ground} motifs={slot.motifs} layer="sky" paused={!playing} />
      </div>
      <div class="stage-layer" data-layer="land" style={style(PARALLAX.land)}>
        <SceneArt sky={slot.sky} ground={slot.ground} motifs={slot.motifs} layer="land" paused={!playing} />
      </div>
      <div class={`stage-layer stage-fx ${playing ? '' : 'paused'}`} style={style(PARALLAX.fx)}>
        <Atmosphere effects={effects} seed={slot.seed} sky={slot.sky} />
      </div>
      <div class="stage-layer" data-layer="fore" style={style(PARALLAX.fore)}>
        <SceneArt sky={slot.sky} ground={slot.ground} motifs={slot.motifs} layer="fore" paused={!playing} />
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
