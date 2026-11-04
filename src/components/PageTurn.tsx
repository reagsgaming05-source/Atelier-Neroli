import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

/** What a page of the storybook shows: its painting and its words. */
export interface Leaf {
  painting?: string;
  /** What lies over the picture, such as the title of the episode on its first page. */
  cover?: ComponentChildren;
  text: string;
  /** The first page of a scene opens with a large initial. */
  opening?: boolean;
  verse?: { ar: string; fr: string };
}

/** How long a page takes to turn, in ms (the CSS animation lasts as long). */
export const TURN_MS = 900;

/** A short rustle of paper, made of filtered noise, when the page turns. */
function rustle(ctx: BaseAudioContext) {
  const t = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * 0.45);
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(2600, t);
  band.frequency.exponentialRampToValueAtTime(900, t + 0.4);
  band.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.06, t + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  src.connect(band).connect(gain).connect(ctx.destination);
  src.start(t);
}

/**
 * The page that has just been read, turning over the new one: it lifts from the
 * spine side and folds away, as in a picture book. `order` tells forwards from backwards.
 */
export function PageTurn({ pageKey, order, leaf, sound }: { pageKey: string; order: number; leaf: Leaf; sound?: BaseAudioContext }) {
  const last = useRef({ key: pageKey, order, leaf });
  const [turning, setTurning] = useState<{ id: number; leaf: Leaf; back: boolean } | null>(null);

  useLayoutEffect(() => {
    const before = last.current;
    last.current = { key: pageKey, order, leaf };
    if (before.key === pageKey) return;
    const id = Date.now();
    setTurning({ id, leaf: before.leaf, back: order < before.order });
    if (sound && sound.state === 'running') rustle(sound);
    const timer = setTimeout(() => setTurning((t) => (t?.id === id ? null : t)), TURN_MS);
    return () => clearTimeout(timer);
  }, [pageKey]);

  // Keeps the page on screen up to date (its painting may arrive late), but not once another page has come.
  if (last.current.key === pageKey) last.current.leaf = leaf;

  if (!turning) return null;
  return (
    <div class={turning.back ? 'leaf back' : 'leaf'} key={turning.id} aria-hidden="true">
      <div class="leaf-picture">
        {turning.leaf.painting && <img src={turning.leaf.painting} alt="" />}
        {turning.leaf.cover}
      </div>
      <div class="page-text">
        <div class={turning.leaf.opening ? 'narration opening' : 'narration'} lang="fr">
          {turning.leaf.text}
        </div>
        {turning.leaf.verse && (
          <>
            <div class="verse-ar" lang="ar">
              {turning.leaf.verse.ar}
            </div>
            <div class="verse-fr">{turning.leaf.verse.fr}</div>
          </>
        )}
      </div>
    </div>
  );
}
