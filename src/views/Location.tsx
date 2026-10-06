import { PlacePicker } from '../components/PlacePicker';
import { TopBar, toast } from '../components/ui';
import { METHODS, recommendedMethod } from '../lib/prayer';
import { back } from '../lib/router';
import { settingsStore, useStore, type Place } from '../lib/settings';

export function Location() {
  const [settings, setSettings] = useStore(settingsStore);
  const place = settings.place;

  const pick = (p: Place) => {
    setSettings((s) => ({ ...s, place: p }));
    const suggested = recommendedMethod(p.countryCode);
    if (p.countryCode && suggested !== settings.method) {
      toast(`Lieu enregistré. Méthode conseillée ici : ${METHODS[suggested].label} (voir Réglages)`);
    } else {
      toast('Lieu enregistré');
    }
    back('/');
  };

  return (
    <>
      <TopBar title="Lieu" backTo="/" />
      <div class="page">
        {place && (
          <div class="card" style={{ marginBottom: '16px' }}>
            <div class="small muted">Lieu actuel</div>
            <div style={{ fontWeight: 650, fontSize: '1.1rem' }}>{place.name}</div>
            <div class="small muted">
              {place.country ? `${place.country} · ` : ''}
              {place.lat.toFixed(3)}, {place.lng.toFixed(3)} · {place.tz}
            </div>
          </div>
        )}
        <PlacePicker onPick={pick} />
      </div>
    </>
  );
}
