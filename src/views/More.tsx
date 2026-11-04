import { Icon, type IconName } from '../components/Icon';
import { SectionTitle, TopBar } from '../components/ui';

const ITEMS: { href: string; icon: IconName; title: string; subtitle: string }[] = [
  { href: '#/qibla', icon: 'compass', title: 'Qibla', subtitle: 'Boussole vers la Ka‘ba' },
  { href: '#/adhkar', icon: 'hands', title: 'Adhkar', subtitle: 'Matin, soir, après la prière, sommeil…' },
  { href: '#/journee', icon: 'target', title: 'Ma journée', subtitle: 'Bonnes actions du jour' },
  { href: '#/khatm', icon: 'book', title: 'Lire tout le Coran', subtitle: 'Plan de lecture quotidien' },
  { href: '#/tasbih', icon: 'beads', title: 'Tasbih', subtitle: 'Compteur de dhikr' },
  { href: '#/calendrier', icon: 'calendar', title: 'Calendrier hégirien', subtitle: 'Ramadan, Aïd, jours blancs' },
  { href: '#/rattrapages', icon: 'reset', title: 'Rattrapages', subtitle: 'Prières et jeûnes à rattraper' },
  { href: '#/zakat', icon: 'coins', title: 'Zakat', subtitle: 'Calculer l’aumône obligatoire' },
];

export function More() {
  return (
    <>
      <TopBar title="Plus" />
      <div class="page">
        <div class="list">
          {ITEMS.map((it) => (
            <a class="list-item" href={it.href} key={it.href}>
              <Icon name={it.icon} />
              <div class="grow">
                <div class="title">{it.title}</div>
                <div class="subtitle">{it.subtitle}</div>
              </div>
              <Icon name="chevron" size={18} />
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
