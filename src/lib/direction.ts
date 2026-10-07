/**
 * Directing the illustrations like a short film: where the camera goes in a
 * scene, and which atmospheric effects float in front of it. Pure functions,
 * so they can be tested without a browser.
 */
import type { Ground, Motif, Sky } from '../data/types';

/** The artwork's own coordinates (see SceneArt). */
export const VIEW = { w: 300, h: 360 };

export interface Focus {
  x: number;
  y: number;
}

/** One framing: the point the camera looks at and how close it is (1 = whole picture). */
export interface Shot extends Focus {
  k: number;
}

/** A measured element of the picture, in artwork coordinates. */
export interface Box extends Focus {
  w: number;
  h: number;
  /** Rank of interest: bigger is looked at earlier. */
  weight: number;
  /** The object it is, when it is one (see Motif). */
  motif?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Seeded random numbers: the same scene is always filmed the same way. */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many shots a scene of `ms` milliseconds is cut into. */
export function shotCount(ms: number, target = 3800) {
  return clamp(Math.round(ms / target), 1, 7);
}

const WIDE: Shot = { x: 150, y: 190, k: 1.04 };
const PULL_BACK: Shot = { x: 150, y: 205, k: 1.14 };

/** Framings that exist whatever the scene holds: sky, horizon, ground. */
const DETAILS: Shot[] = [
  { x: 82, y: 110, k: 1.3 },
  { x: 220, y: 112, k: 1.3 },
  { x: 150, y: 236, k: 1.35 },
  { x: 74, y: 270, k: 1.3 },
  { x: 232, y: 266, k: 1.3 },
  { x: 150, y: 160, k: 1.2 },
];

/** A framing for one measured element: close enough to see it, never so close that it is lost. */
export function shotOn(box: Box): Shot {
  const size = Math.max(box.w, box.h * 0.8, 1);
  return { x: clamp(box.x, 20, 280), y: clamp(box.y, 40, 330), k: clamp(150 / size, 1.15, 1.5) };
}

const SKY_SHOT: Shot = { x: 150, y: 100, k: 1.3 };
const GROUND_SHOT: Shot = { x: 150, y: 280, k: 1.35 };
const HORIZON_SHOT: Shot = { x: 150, y: 232, k: 1.25 };

/** What the camera looks at when the picture says so (an object, the sky, the ground, the horizon). */
export function focusShot(boxes: Box[], focus?: string): Shot | undefined {
  if (!focus) return undefined;
  if (focus === 'sky') return SKY_SHOT;
  if (focus === 'ground') return GROUND_SHOT;
  if (focus === 'horizon') return HORIZON_SHOT;
  const box = boxes.find((b) => b.motif === focus && b.w > 1 && b.h > 1);
  return box ? shotOn(box) : undefined;
}

/**
 * The camera's route through a picture of `count` shots (at least 2). It starts from
 * where the camera is (`from`, or a wide shot), glides towards what the picture is
 * about (`focus`), then visits other objects, the sky, the horizon and the ground,
 * so that something new is always in sight.
 */
export function planShots(boxes: Box[], count: number, seed: number, focus?: string, from?: Shot): Shot[] {
  const rand = rng(seed);
  const start = from ?? (rand() < 0.5 ? WIDE : { ...WIDE, x: 120 + rand() * 60 });
  if (count <= 1) return [start];
  const main = focusShot(boxes, focus);
  const subjects = boxes
    .filter((b) => b.w > 3 && b.h > 3 && b.x > -20 && b.x < 320 && (!focus || b.motif !== focus))
    .sort((a, b) => b.weight - a.weight)
    .map(shotOn);
  const details = [...DETAILS].sort(() => rand() - 0.5);
  const route: Shot[] = main ? [main] : [];
  // Alternate objects and open views so that the camera never lingers on the same kind of view.
  for (let i = 0; route.length < count - 1 && (i < subjects.length || i < details.length); i++) {
    if (subjects[i]) route.push(subjects[i]);
    if (route.length < count - 1 && details[i]) route.push(details[i]);
  }
  while (route.length < count - 1) route.push(PULL_BACK);
  // Opening on the object: begin a little further back, so that the camera comes towards it.
  const first = route[0];
  if (main && !from) return [{ x: (WIDE.x + first.x) / 2, y: (WIDE.y + first.y) / 2, k: 1.05 }, ...route.slice(0, count - 1)];
  return [start, ...route.slice(0, count - 1)];
}

/**
 * The camera's route through a painting: slow pushes and drifts, never closer than it can bear
 * (the painting is a flat picture), starting from where the camera is.
 */
export function planPainting(count: number, seed: number, from?: Shot): Shot[] {
  const rand = rng(seed);
  const start = from ?? { x: 150, y: 190, k: 1.04 };
  const route: Shot[] = [start];
  let side = rand() < 0.5 ? -1 : 1;
  for (let i = 1; i < Math.max(count, 2); i++) {
    const k = i % 2 ? 1.12 + rand() * 0.1 : 1.03 + rand() * 0.05;
    route.push({ x: 150 + side * (14 + rand() * 22), y: 150 + rand() * 90, k });
    side = -side;
  }
  return route;
}

export interface Stage {
  w: number;
  h: number;
}

/**
 * The CSS transform (translate, then scale from the top-left corner) that puts
 * `focus` in the middle of the stage at zoom `k`. The artwork is drawn as "slice",
 * so it is first mapped to the stage the way the browser does; the result never
 * shows past the picture's edges.
 */
export function cameraTransform(stage: Stage, focus: Focus, k: number) {
  const s = Math.max(stage.w / VIEW.w, stage.h / VIEW.h);
  const px = (stage.w - VIEW.w * s) / 2 + focus.x * s;
  const py = (stage.h - VIEW.h * s) / 2 + focus.y * s;
  const tx = clamp(stage.w / 2 - k * px, stage.w - k * stage.w, 0);
  const ty = clamp(stage.h / 2 - k * py, stage.h - k * stage.h, 0);
  return { tx, ty, k };
}

/** Zoom of a layer that moves `factor` times as much as the main one (parallax). */
export const layerZoom = (k: number, factor: number) => 1 + (k - 1) * factor;

export type Effect = 'dust' | 'fireflies' | 'embers' | 'sand' | 'mist' | 'rays' | 'leaves' | 'birds' | 'clouds';

/** What floats in front of the picture, from the sky, the ground and the objects of the scene. */
export function effectsFor(scene: { sky: Sky; ground: Ground; motifs?: readonly Motif[] }): Effect[] {
  const m = new Set(scene.motifs ?? []);
  const out = new Set<Effect>();
  const open = ['desert', 'plain', 'mountains', 'valley', 'city'].includes(scene.ground);
  if (scene.sky === 'night') {
    if (['garden', 'valley', 'river', 'plain'].includes(scene.ground)) out.add('fireflies');
    if (scene.ground === 'cave') out.add('mist');
  } else {
    if (open && scene.sky !== 'storm') out.add('dust');
    if (scene.sky !== 'storm') out.add('clouds');
  }
  if (scene.sky === 'storm') {
    out.add('mist');
    out.add('clouds');
  }
  if (scene.ground === 'desert' && (m.has('wind') || scene.sky === 'storm')) out.add('sand');
  if (m.has('fire') || m.has('lamp')) out.add('embers');
  if (m.has('light') || (scene.sky === 'day' && m.has('sun')) || scene.sky === 'dawn') out.add('rays');
  if (m.has('birds') || m.has('hoopoe')) if (scene.sky !== 'night' && scene.sky !== 'storm') out.add('birds');
  if (scene.ground === 'garden' || m.has('palm') || m.has('palms') || m.has('tree')) if (scene.sky !== 'night') out.add('leaves');
  if (scene.ground === 'cave' || (scene.ground === 'valley' && scene.sky === 'dawn') || m.has('flood')) out.add('mist');
  return [...out];
}

/** A stable number for a scene, from its text, to seed its direction. */
export function sceneSeed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
