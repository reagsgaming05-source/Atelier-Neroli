import { distanceKm } from './prayer';
import type { Place } from './settings';

/** [name, country code, country, region, lat, lng, timezone, population] */
type CityRow = [string, string, string, string, number, number, string, number];

let citiesPromise: Promise<CityRow[]> | null = null;

function loadCities(): Promise<CityRow[]> {
  if (!citiesPromise) {
    citiesPromise = fetch(`${import.meta.env.BASE_URL}data/cities.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    citiesPromise.catch(() => (citiesPromise = null));
  }
  return citiesPromise;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** French spellings of common city names that the dataset stores in English. */
const ALIASES: Record<string, string> = {
  'la mecque': 'makkah',
  mecque: 'makkah',
  medine: 'medina',
  alger: 'algiers',
  londres: 'london',
  bruxelles: 'brussels',
  geneve: 'geneva',
  'le caire': 'cairo',
  caire: 'cairo',
  'al qods': 'jerusalem',
  moscou: 'moscow',
  pekin: 'beijing',
  lisbonne: 'lisbon',
  varsovie: 'warsaw',
  vienne: 'vienna',
  copenhague: 'copenhagen',
  marrakech: 'marrakesh',
  fes: 'fez',
  tanger: 'tangier',
  djeddah: 'jeddah',
  riyad: 'riyadh',
  doubai: 'dubai',
  'abou dabi': 'abu dhabi',
  koweit: 'kuwait',
};

function toPlace(c: CityRow): Place {
  return {
    name: c[0],
    countryCode: c[1],
    country: c[3] && c[3] !== c[0] ? `${c[3]}, ${c[2]}` : c[2],
    lat: c[4],
    lng: c[5],
    tz: c[6],
    source: 'city',
  };
}

export async function searchCities(query: string, limit = 12): Promise<Place[]> {
  let q = fold(query);
  if (q.length < 2) return [];
  q = ALIASES[q] ?? q;
  const rows = await loadCities();
  const starts: CityRow[] = [];
  const contains: CityRow[] = [];
  for (const c of rows) {
    const name = fold(c[0]);
    if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q) || fold(`${c[0]} ${c[2]}`).startsWith(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit).map(toPlace);
}

/** Closest known city, used to name a GPS position and suggest a calculation method. */
export async function nearestCity(lat: number, lng: number): Promise<{ place: Place; km: number } | null> {
  try {
    const rows = await loadCities();
    let best: CityRow | null = null;
    let bestKm = Infinity;
    for (const c of rows) {
      const km = distanceKm(lat, lng, c[4], c[5]);
      if (km < bestKm) {
        best = c;
        bestKm = km;
      }
    }
    return best ? { place: toPlace(best), km: bestKm } : null;
  } catch {
    return null;
  }
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

/** Locates the device and names the position after the nearest city. */
export async function locate(): Promise<Place> {
  const pos = await getPosition();
  const { latitude: lat, longitude: lng } = pos.coords;
  const near = await nearestCity(lat, lng);
  return {
    name: near ? (near.km < 25 ? near.place.name : `Près de ${near.place.name}`) : 'Ma position',
    country: near?.place.country,
    countryCode: near?.place.countryCode,
    lat: Math.round(lat * 1e4) / 1e4,
    lng: Math.round(lng * 1e4) / 1e4,
    tz: deviceTimeZone(),
    source: 'gps',
  };
}
