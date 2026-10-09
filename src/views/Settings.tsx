import { useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SectionTitle, Stepper, Switch, TopBar, toast } from '../components/ui';
import { formatHijri, hijriDate, noonUtc } from '../lib/hijri';
import { requestPermission, notificationsSupported, chime } from '../lib/notify';
import { METHODS, OBLIGATORY, PRAYER_NAMES, PRAYER_ORDER, dayIn, recommendedMethod, type MethodId } from '../lib/prayer';
import { downloadAll } from '../lib/quran';
import { DEFAULT_SETTINGS, settingsStore, useStore, type HighLatRule, type Settings as S } from '../lib/settings';

export function Settings() {
  const [settings, setSettings] = useStore(settingsStore);
  const [download, setDownload] = useState<number | null>(null);
  const update = (patch: Partial<S>) => setSettings((s) => ({ ...s, ...patch }));
  const place = settings.place;
  const suggested = recommendedMethod(place?.countryCode);
  const t = dayIn(place?.tz ?? 'UTC');
  const hijri = hijriDate(noonUtc(t.y, t.m, t.d), settings.hijriOffset);

  const toggleNotifications = async (on: boolean) => {
    if (!on) {
      update({ notify: { ...settings.notify, enabled: false } });
      return;
    }
    const perm = await requestPermission();
    if (perm !== 'granted') {
      toast('Notifications refusées : autorisez-les dans les réglages du navigateur');
      return;
    }
    update({ notify: { ...settings.notify, enabled: true } });
    toast('Alertes activées tant que l’application est ouverte');
  };

  const downloadQuran = async () => {
    setDownload(0);
    try {
      const editions = ['ar', settings.quran.translation === 'none' ? 'fr-hamidullah' : settings.quran.translation] as const;
      await downloadAll([...editions], setDownload);
      toast('Coran disponible hors-ligne');
    } catch {
      toast('Téléchargement interrompu, réessayez avec une connexion');
    } finally {
      setDownload(null);
    }
  };

  return (
    <>
      <TopBar title="Réglages" backTo="/plus" />
      <div class="page">
        <SectionTitle>Lieu</SectionTitle>
        <a class="list-item list" href="#/lieu">
          <Icon name="pin" />
          <div class="grow">
            <div class="title">{place?.name ?? 'Aucun lieu'}</div>
            <div class="subtitle">{place ? `${place.country ?? ''} ${place.tz}` : 'Choisir un lieu'}</div>
          </div>
          <Icon name="chevron" size={18} />
        </a>

        <SectionTitle>Calcul des horaires</SectionTitle>
        <div class="card">
          <label class="field">
            <span>Méthode</span>
            <select class="input" value={settings.method} onChange={(e) => update({ method: (e.target as HTMLSelectElement).value as MethodId })}>
              {(Object.keys(METHODS) as MethodId[]).map((id) => (
                <option value={id} key={id}>
                  {METHODS[id].label}
                  {id === suggested ? ' (conseillée)' : ''}
                </option>
              ))}
            </select>
            <small class="muted">{METHODS[settings.method].detail}</small>
          </label>
          <label class="field">
            <span>Asr</span>
            <select class="input" value={settings.madhab} onChange={(e) => update({ madhab: (e.target as HTMLSelectElement).value as S['madhab'] })}>
              <option value="shafi">Majoritaire — ombre = 1× (shafi‘ite, malikite, hanbalite)</option>
              <option value="hanafi">Hanafite — ombre = 2×</option>
            </select>
          </label>
          <label class="field">
            <span>Hautes latitudes</span>
            <select class="input" value={settings.highLat} onChange={(e) => update({ highLat: (e.target as HTMLSelectElement).value as HighLatRule })}>
              <option value="auto">Automatique (recommandé)</option>
              <option value="middleofthenight">Milieu de la nuit</option>
              <option value="seventhofthenight">Septième de la nuit</option>
              <option value="twilightangle">Angle du crépuscule</option>
            </select>
            <small class="muted">Utile en été au nord de l’Europe, quand le crépuscule ne finit jamais.</small>
          </label>
        </div>

        <SectionTitle action={<button class="btn ghost" style={{ minHeight: 0, padding: 0 }} onClick={() => update({ adjust: DEFAULT_SETTINGS.adjust })}>Réinitialiser</button>}>
          Ajustements (minutes)
        </SectionTitle>
        <div class="card stack">
          {PRAYER_ORDER.map((id) => (
            <div class="row" key={id}>
              <span class="grow">{PRAYER_NAMES[id].fr}</span>
              <Stepper
                label={`Ajustement ${PRAYER_NAMES[id].fr}`}
                value={settings.adjust[id]}
                min={-30}
                max={30}
                format={(v) => (v > 0 ? `+${v}` : String(v))}
                onChange={(v) => update({ adjust: { ...settings.adjust, [id]: v } })}
              />
            </div>
          ))}
          <p class="small muted" style={{ margin: 0 }}>
            Pour caler les horaires sur ceux de votre mosquée.
          </p>
        </div>

        <SectionTitle>Alertes de prière</SectionTitle>
        <div class="card stack">
          {notificationsSupported() ? (
            <>
              <div class="row">
                <span class="grow">Notifications</span>
                <Switch label="Notifications" checked={settings.notify.enabled} onChange={toggleNotifications} />
              </div>
              {settings.notify.enabled && (
                <>
                  {OBLIGATORY.map((id) => (
                    <div class="row" key={id}>
                      <span class="grow">{PRAYER_NAMES[id].fr}</span>
                      <Switch
                        label={PRAYER_NAMES[id].fr}
                        checked={settings.notify.prayers[id]}
                        onChange={(v) => update({ notify: { ...settings.notify, prayers: { ...settings.notify.prayers, [id]: v } } })}
                      />
                    </div>
                  ))}
                  <div class="row">
                    <span class="grow">Rappel avant</span>
                    <Stepper
                      label="Rappel avant la prière"
                      value={settings.notify.before}
                      min={0}
                      max={60}
                      step={5}
                      format={(v) => (v === 0 ? 'non' : `${v} min`)}
                      onChange={(v) => update({ notify: { ...settings.notify, before: v } })}
                    />
                  </div>
                  <div class="row">
                    <span class="grow">Son</span>
                    <button class="btn ghost" style={{ minHeight: 0 }} onClick={chime}>
                      Tester
                    </button>
                    <Switch label="Son" checked={settings.notify.sound} onChange={(v) => update({ notify: { ...settings.notify, sound: v } })} />
                  </div>
                </>
              )}
            </>
          ) : (
            <p style={{ margin: 0 }}>Les notifications ne sont pas disponibles dans ce navigateur.</p>
          )}
          <p class="small muted" style={{ margin: 0 }}>
            Une application web ne peut pas se réveiller seule une fois fermée. Pour des alertes fiables, utilisez « Ajouter à mon agenda »
            dans la page Prières. Sur iPhone, installez d’abord l’application sur l’écran d’accueil.
          </p>
        </div>

        <SectionTitle>Calendrier hégirien</SectionTitle>
        <div class="card">
          <div class="row">
            <div class="grow">
              <div>Décalage</div>
              <div class="small muted">Aujourd’hui : {formatHijri(hijri)}</div>
            </div>
            <Stepper
              label="Décalage hégirien"
              value={settings.hijriOffset}
              min={-2}
              max={2}
              format={(v) => (v > 0 ? `+${v} j` : `${v} j`)}
              onChange={(v) => update({ hijriOffset: v })}
            />
          </div>
        </div>

        <SectionTitle>Affichage</SectionTitle>
        <div class="card stack">
          <div>
            <div class="small muted" style={{ marginBottom: '6px' }}>
              Format de l’heure
            </div>
            <div class="chip-row">
              <button class="chip" aria-pressed={settings.clock === '24h'} onClick={() => update({ clock: '24h' })}>
                24 h
              </button>
              <button class="chip" aria-pressed={settings.clock === '12h'} onClick={() => update({ clock: '12h' })}>
                12 h
              </button>
            </div>
          </div>
        </div>

        <SectionTitle>Hors-ligne</SectionTitle>
        <div class="card stack">
          <p style={{ margin: 0 }}>
            Les horaires, la qibla et les adhkar fonctionnent sans connexion. Les sourates sont gardées après la première lecture ; vous pouvez
            aussi tout télécharger d’un coup (environ 3 Mo).
          </p>
          {download === null ? (
            <button class="btn secondary block" onClick={downloadQuran}>
              <Icon name="download" size={18} /> Télécharger le Coran
            </button>
          ) : (
            <div class="progress">
              <div style={{ width: `${download * 100}%` }} />
            </div>
          )}
        </div>

        <SectionTitle>Données</SectionTitle>
        <div class="card stack">
          <p class="small muted" style={{ margin: 0 }}>
            Tout est enregistré sur cet appareil uniquement. Aucun compte, aucun serveur, aucune publicité.
          </p>
          <button
            class="btn secondary block"
            style={{ color: 'var(--danger)' }}
            onClick={() => {
              if (confirm('Effacer toutes les données de Sakina sur cet appareil (réglages, marque-pages, suivi) ?')) {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('sakina.'))
                  .forEach((k) => localStorage.removeItem(k));
                location.reload();
              }
            }}
          >
            Tout effacer
          </button>
        </div>
      </div>
    </>
  );
}
