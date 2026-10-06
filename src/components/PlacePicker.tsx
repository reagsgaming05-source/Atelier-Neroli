import { useEffect, useState } from 'preact/hooks';
import { Icon } from './Icon';
import { Spinner } from './ui';
import { deviceTimeZone, locate, searchCities } from '../lib/cities';
import type { Place } from '../lib/settings';

/** GPS, city search and manual coordinates. Calls `onPick` with the chosen place. */
export function PlacePicker({ onPick }: { onPick: (p: Place) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchCities(query);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setError('Liste des villes indisponible hors-ligne pour le moment.');
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const useGps = async () => {
    setBusy(true);
    setError('');
    try {
      onPick(await locate());
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      setError(
        code === 1
          ? 'Accès à la position refusé. Autorisez-le dans les réglages du navigateur, ou cherchez votre ville.'
          : 'Position introuvable. Cherchez votre ville ci-dessous.',
      );
    } finally {
      setBusy(false);
    }
  };

  const submitManual = (e: Event) => {
    e.preventDefault();
    const la = Number(lat.replace(',', '.'));
    const lo = Number(lng.replace(',', '.'));
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
      setError('Coordonnées invalides (latitude entre -90 et 90, longitude entre -180 et 180).');
      return;
    }
    onPick({ name: `${la.toFixed(3)}, ${lo.toFixed(3)}`, lat: la, lng: lo, tz: deviceTimeZone(), source: 'manual' });
  };

  return (
    <div class="stack">
      <button class="btn block" onClick={useGps} disabled={busy}>
        <Icon name="locate" size={20} /> {busy ? 'Localisation…' : 'Utiliser ma position'}
      </button>
      {busy && <Spinner />}
      {error && <div class="notice">{error}</div>}

      <div class="search">
        <Icon name="search" size={20} />
        <input
          class="input"
          type="search"
          placeholder="Rechercher une ville…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          aria-label="Rechercher une ville"
          autocomplete="off"
        />
      </div>

      {results.length > 0 && (
        <div class="list">
          {results.map((p) => (
            <button class="list-item" key={`${p.name}-${p.lat}-${p.lng}`} onClick={() => onPick(p)}>
              <Icon name="pin" size={20} />
              <div class="grow">
                <div class="title">{p.name}</div>
                <div class="subtitle">{p.country}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && results.length === 0 && (
        <p class="small muted center">Aucune ville trouvée. Essayez la ville la plus proche ou les coordonnées.</p>
      )}

      {manual ? (
        <form class="card" onSubmit={submitManual}>
          <label class="field">
            <span>Latitude</span>
            <input class="input" inputMode="decimal" value={lat} onInput={(e) => setLat((e.target as HTMLInputElement).value)} placeholder="48.8566" />
          </label>
          <label class="field">
            <span>Longitude</span>
            <input class="input" inputMode="decimal" value={lng} onInput={(e) => setLng((e.target as HTMLInputElement).value)} placeholder="2.3522" />
          </label>
          <p class="small muted">Fuseau horaire utilisé : {deviceTimeZone()} (celui de l’appareil).</p>
          <button class="btn block" type="submit">
            Valider
          </button>
        </form>
      ) : (
        <button class="btn ghost block" onClick={() => setManual(true)}>
          Saisir des coordonnées
        </button>
      )}
    </div>
  );
}
