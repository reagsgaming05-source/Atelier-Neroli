/**
 * Pictures painted by an image model (see scripts/images): one file per picture of a scene,
 * in one or two styles. A scene without a painting keeps its drawn picture.
 */
export type Look = 'draw' | 'book' | 'cine';

export const LOOKS: { id: Look; label: string }[] = [
  { id: 'draw', label: 'Dessin' },
  { id: 'book', label: 'Livre' },
  { id: 'cine', label: 'Cinéma' },
];

type PaintingIndex = Partial<Record<Exclude<Look, 'draw'>, string[]>>;

const base = () => `${import.meta.env.BASE_URL}data/paintings/`;
let index: Promise<PaintingIndex> | null = null;

export function loadPaintings(): Promise<PaintingIndex> {
  index ??= fetch(`${base()}index.json`)
    .then((r) => (r.ok ? (r.json() as Promise<PaintingIndex>) : {}))
    .catch(() => {
      index = null; // offline: try again next time
      return {};
    });
  return index;
}

/** The key of a picture: story, episode, scene, picture. */
export const paintingKey = (storyId: string, episode: number, scene: number, picture: number) => `${storyId}-${episode}-${scene}-${picture}`;

/** The painting of a picture in this look, or undefined (it is drawn instead). */
export function paintingUrl(found: PaintingIndex, look: Look, key: string): string | undefined {
  if (look === 'draw') return undefined;
  return found[look]?.includes(key) ? `${base()}${look}/${key}.webp` : undefined;
}

/** Whether any picture of the episode is painted in this look. */
export function hasPaintings(found: PaintingIndex, look: Exclude<Look, 'draw'>, storyId: string, episode: number) {
  const prefix = `${storyId}-${episode}-`;
  return !!found[look]?.some((k) => k.startsWith(prefix));
}
