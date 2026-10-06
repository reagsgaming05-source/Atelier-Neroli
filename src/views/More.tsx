import { Icon, type IconName } from '../components/Icon';
import { SectionTitle, TopBar } from '../components/ui';

const ITEMS: { href: string; icon: IconName; title: string; subtitle: string; gold?: boolean }[] = [
  { href: '#/adhkar', icon: 'hands', title: 'Adhkar', subtitle: 'Matin, soir, après la prière, sommeil…', gold: true },
  { href: '#/tasbih', icon: 'beads', title: 'Tasbih', subtitle: 'Compteur de dhikr' },
  { href: '#/noms', icon: 'star', title: '99 noms d’Allah', subtitle: 'Al-Asmā’ al-Ḥusnā', gold: true },
  { href: '#/calendrier', icon: 'calendar', title: 'Calendrier hégirien', subtitle: 'Ramadan, Aïd, jours blancs' },
  { href: '#/zakat', icon: 'coins', title: 'Zakat', subtitle: 'Calculer l’aumône obligatoire', gold: true },
  { href: '#/suivi', icon: 'check', title: 'Suivi des prières', subtitle: 'Votre régularité' },
];

export function More() {
  return (
    <>
      <TopBar title="Plus" />
      <div class="page">
        <div class="tile-grid">
          {ITEMS.map((it) => (
            <a class="tile" href={it.href} key={it.href}>
              <span class={`tile-icon ${it.gold ? 'gold' : ''}`}>
                <Icon name={it.icon} />
              </span>
              <strong>{it.title}</strong>
              <span>{it.subtitle}</span>
            </a>
          ))}
        </div>
        <SectionTitle>Application</SectionTitle>
        <div class="list">
          <a class="list-item" href="#/reglages">
            <Icon name="settings" />
            <div class="grow">
              <div class="title">Réglages</div>
              <div class="subtitle">Méthode de calcul, notifications, thème</div>
            </div>
            <Icon name="chevron" size={18} />
          </a>
          <a class="list-item" href="#/lieu">
            <Icon name="pin" />
            <div class="grow">
              <div class="title">Changer de lieu</div>
              <div class="subtitle">Position GPS ou recherche de ville</div>
            </div>
            <Icon name="chevron" size={18} />
          </a>
          <a class="list-item" href="#/apropos">
            <Icon name="info" />
            <div class="grow">
              <div class="title">À propos</div>
              <div class="subtitle">Sources, confidentialité, licences</div>
            </div>
            <Icon name="chevron" size={18} />
          </a>
        </div>
      </div>
    </>
  );
}
