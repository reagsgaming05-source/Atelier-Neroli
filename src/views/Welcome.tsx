import { useState } from 'preact/hooks';
import { PlacePicker } from '../components/PlacePicker';
import { METHODS, recommendedMethod } from '../lib/prayer';
import { settingsStore, useStore, type Place } from '../lib/settings';

/** First launch: a short welcome, then pick a location. */
export function Welcome() {
  const [, setSettings] = useStore(settingsStore);
  const [step, setStep] = useState<'intro' | 'place'>('intro');

  const pick = (place: Place) => {
    const method = recommendedMethod(place.countryCode);
    setSettings((s) => ({ ...s, place, method, onboarded: true }));
  };

  if (step === 'intro') {
    return (
      <main class="welcome">
        <div class="ar">السَّلَامُ عَلَيْكُمْ</div>
        <h1>Bienvenue sur Sakina</h1>
        <p>Votre compagnon de prière, gratuit pour toujours.</p>
        <ul>
          <li>Horaires de prière précis, partout dans le monde</li>
          <li>Coran complet en arabe et en français, avec récitation</li>
          <li>Qibla, adhkar, tasbih, calendrier hégirien, zakat</li>
          <li>Sans publicité, sans compte, sans pistage — vos données restent sur votre téléphone</li>
        </ul>
        <button class="btn block" style={{ marginTop: '24px', background: '#d9b45a', color: '#1b1a12' }} onClick={() => setStep('place')}>
          Commencer
        </button>
      </main>
    );
  }

  return (
    <main class="welcome" style={{ justifyContent: 'flex-start' }}>
      <h1 style={{ marginTop: '24px' }}>Où priez-vous ?</h1>
      <p>Votre position sert uniquement à calculer les horaires et la qibla, sur votre appareil.</p>
      <div class="card" style={{ marginTop: '8px' }}>
        <PlacePicker onPick={pick} />
      </div>
      <p class="small" style={{ marginTop: '16px' }}>
        La méthode de calcul est choisie selon votre pays (par exemple « {METHODS.uoif.label} » en France) et se
        change à tout moment dans les réglages.
      </p>
    </main>
  );
}
