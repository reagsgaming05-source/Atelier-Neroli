import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ground, Motif, Sky } from '../data/types';
import {
  cameraTransform,
  effectsFor,
  layerZoom,
  planShots,
  rng,
  shotCount,
  type Box,
  type Effect,
  type Stage as StageSize,
} from '../lib/direction';
import { SceneArt } from './SceneArt';

/** How much of the camera's movement each layer follows: the sky is far away, the foreground close. */
const PARALLAX = { sky: 0.5, land: 1, fx: 1.2, fore: 1.5 } as const;

/**
 * One scene shot like a film: the picture is built in three layers that the
 * camera moves across at different speeds, with floating atmosphere in front.
 * The camera never stops: each shot is a slow move towards the next framing.
 */
export function Stage({
  sky,
  ground,
  motifs = [],
  seed,
  ms,
  playing,
  label,
}: {
  sky: Sky;
  ground: Ground;
  motifs?: Motif[];
  /** Number that makes the direction of this scene reproducible. */
  seed: number;
  /** How long the scene lasts, to pace its shots. */
  ms: number;
  playing: boolean;
  label?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<StageSize>({ w: 390, h: 520 });
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [shot, setShot] = useState(0);

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

  // Where each object of the picture is, so the camera can go and look at it.
  const key = `${sky}/${ground}/${motifs.join('+')}`;
  useLayoutEffect(() => {
    const found: Box[] = [];
    root.current?.querySelectorAll<SVGGElement>('[data-m]').forEach((g) => {
      try {
        const b = g.getBBox();
        const far = g.closest('[data-layer="sky"]') ? 0.7 : 1;
        found.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height, weight: Math.min(Math.sqrt(b.width * b.height), 70) * far });
      } catch {
        /* not rendered (hidden tab): the camera falls back to the generic views */
      }
    });
    setBoxes(found);
  }, [key]);

  const shots = useMemo(() => planShots(boxes, Math.max(shotCount(ms), 2), seed), [boxes, ms, seed]);
  // Moves between framings take most of the time available: the camera is always drifting.
  const leg = Math.max(ms / Math.max(shots.length - 1, 1), 1800);

  useEffect(() => setShot(0), [seed, key]);
  useEffect(() => {
    if (!playing || shot >= shots.length - 1) return;
    const t = window.setTimeout(() => setShot((s) => s + 1), shot === 0 ? 450 : leg);
    return () => clearTimeout(t);
  }, [playing, shot, shots.length, leg]);

  const current = shots[Math.min(shot, shots.length - 1)];
  const style = (factor: number) => {
    const { tx, ty, k } = cameraTransform(size, current, layerZoom(current.k, factor));
    return {
      transform: `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${k.toFixed(3)})`,
      transitionDuration: `${Math.round(leg * 0.94)}ms`,
    };
  };
  const effects = useMemo(() => effectsFor({ sky, ground, motifs }), [key]);

  return (
    <div class="stage" ref={root} role="img" aria-label={label ?? 'Illustration'}>
      <div class="stage-layer" data-layer="sky" style={style(PARALLAX.sky)}>
        <SceneArt sky={sky} ground={ground} motifs={motifs} layer="sky" still={!playing} />
      </div>
      <div class="stage-layer" data-layer="land" style={style(PARALLAX.land)}>
        <SceneArt sky={sky} ground={ground} motifs={motifs} layer="land" still={!playing} />
      </div>
      <div class={`stage-layer stage-fx ${playing ? '' : 'paused'}`} style={style(PARALLAX.fx)}>
        <Atmosphere effects={effects} seed={seed} sky={sky} />
      </div>
      <div class="stage-layer" data-layer="fore" style={style(PARALLAX.fore)}>
        <SceneArt sky={sky} ground={ground} motifs={motifs} layer="fore" still={!playing} />
      </div>
      <div class="stage-grade" aria-hidden="true" />
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
