import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  // Serve public/data/cities.json to the app's fetch.
  vi.stubGlobal('fetch', async (url: string) => {
    const file = new URL(`../public/${String(url).replace(/^.*?data\//, 'data/')}`, import.meta.url);
    const body = await readFile(file, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  });
});

const load = () => import('../src/lib/cities');

describe('city search', () => {
  it('finds Swiss localities, big cities first, with their canton', async () => {
    const { searchCities } = await load();
    const [lausanne] = await searchCities('lausanne');
    expect(lausanne).toMatchObject({ name: 'Lausanne', country: 'Vaud, Suisse', tz: 'Europe/Zurich', postcode: '1000' });
    expect((await searchCities('Montreux'))[0].name).toBe('Montreux');
    expect((await searchCities('yverdon'))[0].name).toBe('Yverdon-les-Bains');
    expect((await searchCities('Zur'))[0].name).toBe('Zürich');
  });

  it('understands French names of Swiss cities', async () => {
    const { searchCities } = await load();
    expect((await searchCities('Genève'))[0].name).toBe('Genève');
    expect((await searchCities('geneva'))[0].name).toBe('Genève');
    expect((await searchCities('Bâle'))[0].name).toBe('Basel');
    expect((await searchCities('Berne'))[0].name).toBe('Bern');
    expect((await searchCities('Saint-Gall'))[0].name).toBe('St. Gallen');
    expect((await searchCities('Bienne'))[0].name).toBe('Biel/Bienne');
  });

  it('finds a locality by its postcode', async () => {
    const { searchCities } = await load();
    expect((await searchCities('1003'))[0]).toMatchObject({ name: 'Lausanne', postcode: '1003' });
    expect((await searchCities('1820'))[0].name).toBe('Montreux');
    expect((await searchCities('8074'))[0].name).toBe('Zürich');
  });

  it('still finds cities elsewhere', async () => {
    const { searchCities } = await load();
    expect((await searchCities('Paris'))[0]).toMatchObject({ name: 'Paris', countryCode: 'FR' });
    expect((await searchCities('la mecque'))[0].name).toBe('Makkah');
  });

  it('guesses a city from the time zone and names a GPS position', async () => {
    const { placeFromTimeZone, nearestCity } = await load();
    expect((await placeFromTimeZone('Europe/Zurich'))?.name).toBe('Zürich');
    expect((await placeFromTimeZone('Europe/Paris'))?.name).toBe('Paris');
    expect((await nearestCity(46.5197, 6.6323))?.place.name).toBe('Lausanne');
  });
});

describe('local cities first', () => {
  it('ranks cities of the preferred country first', async () => {
    const { searchCities } = await import('../src/lib/cities');
    const swiss = await searchCities('Mont', 5, 'CH');
    expect(swiss[0].countryCode).toBe('CH');
    expect(swiss.map((p) => p.name)).toContain('Montreux');
    const french = await searchCities('Saint', 5, 'FR');
    expect(french[0].countryCode).toBe('FR');
  });
});
