import { useEffect } from 'preact/hooks';
import { Suspense, lazy } from 'preact/compat';
import { BottomNav, Spinner, ToastHost } from './components/ui';
import { scheduleAlerts } from './lib/notify';
import { useRoute } from './lib/router';
import { settingsStore, useStore } from './lib/settings';
import { About } from './views/About';
import { Calendar } from './views/Calendar';
import { Home } from './views/Home';
import { Location } from './views/Location';
import { More } from './views/More';
import { Prayers } from './views/Prayers';
import { Qibla } from './views/Qibla';
import { QuranIndex } from './views/QuranIndex';
import { Reader } from './views/Reader';
import { Settings } from './views/Settings';
import { Tasbih } from './views/Tasbih';
import { Tracker } from './views/Tracker';
import { Welcome } from './views/Welcome';
import { Zakat } from './views/Zakat';

// Text-heavy screens load on demand to keep the first load small; the service
// worker still precaches them for offline use.
const AdhkarIndex = lazy(() => import('./views/Adhkar').then((m) => ({ default: m.AdhkarIndex })));
const AdhkarCategory = lazy(() => import('./views/Adhkar').then((m) => ({ default: m.AdhkarCategory })));
const Names = lazy(() => import('./views/Names').then((m) => ({ default: m.Names })));

export function App() {
  const [settings] = useStore(settingsStore);
  const route = useRoute();
  const [section = '', param] = route.path;

  // Theme override (auto follows the system).
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
  }, [settings.theme]);

  // In-app prayer alerts, refreshed on changes and every hour.
  useEffect(() => {
    scheduleAlerts(settings);
    const id = setInterval(() => scheduleAlerts(settingsStore.get()), 3600_000);
    return () => clearInterval(id);
  }, [settings.place, settings.notify, settings.method, settings.madhab, settings.adjust, settings.highLat]);

  // New page: start at the top, except in the Quran reader which handles its own scroll.
  useEffect(() => {
    if (section !== 'coran' || !param) window.scrollTo(0, 0);
  }, [section, param]);

  if (!settings.place || !settings.onboarded) {
    return (
      <>
        <Welcome />
        <ToastHost />
      </>
    );
  }

  let page;
  switch (section) {
    case '':
      page = <Home />;
      break;
    case 'prieres':
      page = <Prayers />;
      break;
    case 'suivi':
      page = <Tracker />;
      break;
    case 'coran': {
      const n = Number(param);
      const v = Number(route.query.get('v')) || undefined;
      page = n >= 1 && n <= 114 ? <Reader key={n} surah={n} verse={v} /> : <QuranIndex tab={route.query.get('tab') ?? undefined} />;
      break;
    }
    case 'qibla':
      page = <Qibla />;
      break;
    case 'adhkar':
      page = param ? <AdhkarCategory id={param} /> : <AdhkarIndex />;
      break;
    case 'tasbih':
      page = <Tasbih />;
      break;
    case 'noms':
      page = <Names />;
      break;
    case 'calendrier':
      page = <Calendar />;
      break;
    case 'zakat':
      page = <Zakat />;
      break;
    case 'reglages':
      page = <Settings />;
      break;
    case 'lieu':
      page = <Location />;
      break;
    case 'apropos':
      page = <About />;
      break;
    default:
      page = <More />;
  }

  return (
    <div class="app">
      <main>
        <Suspense fallback={<Spinner />}>{page}</Suspense>
      </main>
      <BottomNav section={section} />
      <ToastHost />
    </div>
  );
}
