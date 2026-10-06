import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './Icon';
import { Spinner } from './ui';
import { deviceTimeZone, locate, placeFromTimeZone, searchCities } from '../lib/cities';
import type { Place } from '../lib/settings';

// Pages shown inside another site's frame (such as a hosted preview) usually
// cannot use location, so the city guess comes first there.
const embedded = typeof window !== 'undefined' && window.top !== window.self;

/** GPS, a guess from the time zone, city search and manual coordinates. Calls `onPick` with the chosen place. */
export function PlacePicker({ onPick }: { onPick: (p: Place) => void }) {
  const [suggestion, setSuggestion] = useState<Place | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  useEffect(() => {
    let cancelled = false;
    placeFromTimeZone().then((p) => !cancelled && setSuggestion(p));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchCities(query, 12, suggestion?.countryCode);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setError('Liste des villes indisponible hors-ligne pour le moment.');
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, suggestion]);

  const useGps = async () => {
    setBusy(true);
    setError('');
    try {
      onPick(await locate());
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      setError(
        embedded
          ? 'La position GPS n’est pas disponible dans cet aperçu. Choisissez votre ville ci-dessous : dans l’application installée, le GPS fonctionne.'
          : code === 1
            ? 'Accès à la position refusé. Choisissez votre ville ci-dessous, ou autorisez la position dans les réglages du navigateur.'
            : 'Position introuvable pour le moment. Choisissez votre ville ci-dessous.',
      );
      searchInput.current?.focus();
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
      {suggestion && (
        <button class={`btn block ${embedded || error ? '' : 'secondary'}`} onClick={() => onPick(suggestion)} style={{ flexDirection: 'column', gap: 0, padding: '8px 18px' }}>
          <span>
            <Icon name="pin" size={18} /> Je suis à {suggestion.name}
          </span>
          <span class="small" style={{ fontWeight: 450, opacity: 0.8 }}>
            {suggestion.country} · d’après le fuseau horaire du téléphone
          </span>
        </button>
      )}
      {!(embedded && error) && (
        <button class={`btn block ${embedded && suggestion ? 'secondary' : ''}`} onClick={useGps} disabled={busy}>
          <Icon name="locate" size={20} /> {busy ? 'Localisation…' : 'Utiliser ma position GPS'}
        </button>
      )}
      {busy && <Spinner />}
      {error && <div class="notice">{error}</div>}

      <div class="search">
        <Icon name="search" size={20} />
        <input
          ref={searchInput}
          id="city-search"
          class="input"
          type="search"
          placeholder="Ou rechercher une ville ou un NPA…"
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
                <div class="subtitle">
                  {p.postcode ? `${p.postcode} · ` : ''}
                  {p.country}
                </div>
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
