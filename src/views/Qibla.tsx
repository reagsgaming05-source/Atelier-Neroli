import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { TopBar, haptic } from '../components/ui';
import { KAABA, distanceKm, qiblaBearing } from '../lib/prayer';
import { settingsStore, useStore } from '../lib/settings';

type CompassState = 'idle' | 'needs-permission' | 'active' | 'unsupported';

interface OrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

export function Qibla() {
  const [settings] = useStore(settingsStore);
  const place = settings.place!;
  const bearing = qiblaBearing(place.lat, place.lng);
  const km = distanceKm(place.lat, place.lng, KAABA.lat, KAABA.lng);
  const [heading, setHeading] = useState<number | null>(null);
  const [state, setState] = useState<CompassState>('idle');

  useEffect(() => {
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (!D) {
      setState('unsupported');
      return;
    }
    if (typeof D.requestPermission === 'function') {
      setState('needs-permission'); // iOS: must be requested from a tap
      return;
    }
    return listen();
  }, []);

  function listen() {
    let got = false;
    const onAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return;
      got = true;
      // alpha grows counter-clockwise; compass heading grows clockwise.
      setHeading((360 - e.alpha + screenAngle()) % 360);
    };
    const onIOS = (e: Event) => {
      const h = (e as OrientationEventIOS).webkitCompassHeading;
      if (typeof h === 'number') {
        got = true;
        setHeading((h + screenAngle()) % 360);
      }
    };
    window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener);
    window.addEventListener('deviceorientation', onIOS);
    setState('active');
    const timeout = setTimeout(() => !got && setState('unsupported'), 3000);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener);
      window.removeEventListener('deviceorientation', onIOS);
    };
  }

  const askPermission = async () => {
    const D = window.DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> };
    try {
      const res = await D.requestPermission();
      if (res === 'granted') listen();
      else setState('unsupported');
    } catch {
      setState('unsupported');
    }
  };

  // Angle between where the phone points and the qibla, in -180..180.
  const delta = heading == null ? null : ((bearing - heading + 540) % 360) - 180;
  const aligned = delta != null && Math.abs(delta) < 4;

  useEffect(() => {
    if (aligned) haptic(40);
  }, [aligned]);

  const dialRotation = heading == null ? 0 : -heading;

  return (
    <>
      <TopBar title="Qibla" subtitle={place.name} />
      <div class="page">
        <div class="compass-wrap">
          <div class={`compass ${aligned ? 'aligned' : ''}`}>
            <svg viewBox="-160 -160 320 320" role="img" aria-label={`Qibla à ${Math.round(bearing)} degrés du nord`}>
              <g class="dial" style={{ transform: `rotate(${dialRotation}deg)` }}>
                <circle class="ring" r="148" fill="var(--surface)" stroke="var(--border)" stroke-width="2" />
                {Array.from({ length: 72 }, (_, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1="-148"
                    x2="0"
                    y2={i % 18 === 0 ? -132 : i % 2 === 0 ? -138 : -142}
                    stroke={i === 0 ? 'var(--danger)' : 'var(--muted)'}
                    stroke-width={i % 18 === 0 ? 2.5 : 1}
                    transform={`rotate(${i * 5})`}
                  />
                ))}
                {/* Each letter sits on the ring but stays upright on screen. */}
                {CARDINALS.map((c, i) => (
                  <text
                    key={c}
                    transform={`rotate(${i * 45}) translate(0 -114) rotate(${-i * 45 - dialRotation})`}
                    text-anchor="middle"
                    dominant-baseline="central"
                    font-size={i % 2 === 0 ? 17 : 12}
                    font-weight={i % 2 === 0 ? 700 : 500}
                    fill={i === 0 ? 'var(--danger)' : 'var(--muted)'}
                    font-family="system-ui, sans-serif"
                  >
                    {c}
                  </text>
                ))}
                <g transform={`rotate(${bearing})`}>
                  <line x1="0" y1="0" x2="0" y2="-96" stroke="var(--gold)" stroke-width="5" stroke-linecap="round" />
                  <g transform="translate(0 -104)">
                    <rect x="-13" y="-13" width="26" height="26" rx="3" fill="#1b1a17" stroke="var(--gold)" stroke-width="2" />
                    <rect x="-13" y="-7" width="26" height="4" fill="var(--gold)" />
                  </g>
                </g>
              </g>
              {/* Fixed marker: where the top of the phone points. */}
              <path d="M0 -160 L9 -146 L-9 -146 Z" fill={aligned ? 'var(--primary)' : 'var(--text)'} />
              <circle r="6" fill="var(--text)" />
            </svg>
          </div>
        </div>

        <div class="qibla-readout">
          <strong>{Math.round(bearing)}°</strong>
          <div class="muted">
            depuis le nord · {CARDINALS[Math.round(bearing / 45) % 8]} · La Mecque à {Math.round(km).toLocaleString('fr-FR')} km
          </div>
          {state === 'active' && heading != null && (
            <p style={{ fontWeight: 600, color: aligned ? 'var(--primary)' : 'var(--text)' }}>
              {aligned
                ? 'Vous êtes face à la qibla'
                : `Tournez vers la ${delta! > 0 ? 'droite' : 'gauche'} de ${Math.abs(Math.round(delta!))}°`}
            </p>
          )}
        </div>

        {state === 'needs-permission' && (
          <button class="btn block" style={{ marginTop: '16px' }} onClick={askPermission}>
            <Icon name="compass" size={20} /> Activer la boussole
          </button>
        )}
        {state === 'unsupported' && (
          <div class="notice" style={{ marginTop: '16px' }}>
            Boussole indisponible sur cet appareil ou ce navigateur. Utilisez l’angle ci-dessus avec une boussole : la qibla est à{' '}
            {Math.round(bearing)}° dans le sens des aiguilles d’une montre depuis le nord.
          </div>
        )}
        <p class="small muted" style={{ marginTop: '16px' }}>
          Tenez le téléphone à plat, loin des objets métalliques et des aimants. Si l’aiguille semble fausse, calibrez la boussole en
          traçant un 8 dans l’air avec le téléphone.
        </p>
      </div>
    </>
  );
}

function screenAngle(): number {
  return (screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number;
}
