import { distanceKm } from './prayer';
import type { Place } from './settings';

/** [name, country code, country, region, lat, lng, timezone, population, postcodes (Switzerland)] */
type CityRow = [string, string, string, string, number, number, string, number, string?];

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
  'le caire': 'cairo',
  geneva: 'geneve',
  bale: 'basel',
  berne: 'bern',
  lucerne: 'luzern',
  'saint gall': 'st gallen',
  'st gall': 'st gallen',
  soleure: 'solothurn',
  schaffhouse: 'schaffhausen',
  bienne: 'biel bienne',
  coire: 'chur',
  thoune: 'thun',
  zoug: 'zug',
  morat: 'murten',
  glaris: 'glarus',
  schwytz: 'schwyz',
  granges: 'grenchen',
  berthoud: 'burgdorf',
  'saint moritz': 'st moritz',
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

let countryNames: Intl.DisplayNames | null = null;
try {
  countryNames = new Intl.DisplayNames(['fr'], { type: 'region' });
} catch {
  /* older browsers keep the English names from the dataset */
}

function toPlace(c: CityRow, postcode?: string): Place {
  const country = countryNames?.of(c[1]) ?? c[2];
  return {
    name: c[0],
    postcode: postcode ?? c[8]?.split(' ')[0],
    countryCode: c[1],
    country: c[3] && c[3] !== c[0] ? `${c[3]}, ${country}` : country,
    lat: c[4],
    lng: c[5],
    tz: c[6],
    source: 'city',
  };
}

/** Cities matching `query`, those of `preferCountry` (ISO code) first, then by population. */
export async function searchCities(query: string, limit = 12, preferCountry?: string): Promise<Place[]> {
  let q = fold(query);
  if (q.length < 2) return [];
  q = ALIASES[q] ?? q;
  const rows = await loadCities();
  // Swiss postcodes: "1003" finds Lausanne.
  if (/^\d{2,4}$/.test(q)) {
    const out: Place[] = [];
    for (const c of rows) {
      const code = c[8]?.split(' ').find((z) => z.startsWith(q));
      if (code) out.push(toPlace(c, code));
      if (out.length >= limit) break;
    }
    return out;
  }
  const starts: CityRow[] = [];
  const contains: CityRow[] = [];
  for (const c of rows) {
    const name = fold(c[0]);
    if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q) || fold(`${c[0]} ${c[2]}`).startsWith(q)) contains.push(c);
  }
  // Rows are sorted by population; a stable sort keeps that order within each group.
  const local = (c: CityRow) => (preferCountry && c[1] === preferCountry ? 0 : 1);
  starts.sort((a, b) => local(a) - local(b));
  contains.sort((a, b) => local(a) - local(b));
  return [...starts, ...contains].slice(0, limit).map((c) => toPlace(c));
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

/**
 * Best guess without GPS: the most populous known city in the device's time
 * zone (e.g. Europe/Paris → Paris). Needs no permission, so it also works
 * where location is blocked.
 */
export async function placeFromTimeZone(tz: string = deviceTimeZone()): Promise<Place | null> {
  try {
    const rows = await loadCities();
    // Rows are sorted by population, so the first match is the largest city.
    const row = rows.find((c) => c[6] === tz);
    return row ? toPlace(row) : null;
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
