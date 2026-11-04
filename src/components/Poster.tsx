import { useEffect, useState } from 'preact/hooks';
import { getSeries } from '../data/series';
import type { Scene } from '../data/types';
import { loadPaintings, paintingKey, paintingUrl } from '../lib/paintings';
import { settingsStore, useStore } from '../lib/settings';
import { SceneArt } from './SceneArt';

type Found = Awaited<ReturnType<typeof loadPaintings>>;
let cached: Found | null = null;

/** The paintings index, loaded once and shared by every poster. */
function usePaintings(): Found | null {
  const [found, setFound] = useState<Found | null>(cached);
  useEffect(() => {
    if (!cached) loadPaintings().then((f) => setFound((cached = f)));
  }, []);
  return found;
}

/**
 * The picture of a story: its painting in the look chosen in the player (the first
 * picture of the first scene, or of the episode given), or the drawn scene while
 * the paintings load, offline, or when the drawn look is chosen.
 */
export function Poster({ storyId, episode = 0, scene, label, still = true }: { storyId: string; episode?: number; scene?: Scene; label: string; still?: boolean }) {
  const [settings] = useStore(settingsStore);
  const found = usePaintings();
  const look = settings.stories.look;
  const s = scene ?? getSeries(storyId)?.episodes[episode]?.scenes[0];
  const url = found && look !== 'draw' ? paintingUrl(found, look, paintingKey(storyId, episode, 0, 0)) : undefined;
  if (url) return <img class="scene-art poster" src={url} alt="" loading="lazy" decoding="async" />;
  if (!s) return null;
  return <SceneArt sky={s.sky} ground={s.ground} motifs={s.motifs} still={still} label={label} />;
}
