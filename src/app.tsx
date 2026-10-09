import { useEffect } from 'preact/hooks';
import { Suspense, lazy } from 'preact/compat';
import { BottomNav, Spinner, ToastHost } from './components/ui';
import { scheduleAlerts } from './lib/notify';
import { useRoute } from './lib/router';
import { settingsStore, useStore } from './lib/settings';
import { About } from './views/About';
import { Calendar } from './views/Calendar';
import { Goals } from './views/Goals';
import { HadithList, HadithView, COLLECTIONS, type CollectionId } from './views/Hadiths';
import { Home } from './views/Home';
import { Location } from './views/Location';
import { More } from './views/More';
import { Khatm } from './views/Khatm';
import { Prayers } from './views/Prayers';
import { Qada } from './views/Qada';
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
const Learn = lazy(() => import('./views/Learn').then((m) => ({ default: m.Learn })));
const Guide = lazy(() => import('./views/Learn').then((m) => ({ default: m.Guide })));
const StoriesIndex = lazy(() => import('./views/Stories').then((m) => ({ default: m.StoriesIndex })));
const ProphetStoryView = lazy(() => import('./views/Stories').then((m) => ({ default: m.ProphetStoryView })));
const SunnahStoryView = lazy(() => import('./views/Stories').then((m) => ({ default: m.SunnahStoryView })));
const Quiz = lazy(() => import('./views/Quiz').then((m) => ({ default: m.Quiz })));
const Player = lazy(() => import('./views/Player').then((m) => ({ default: m.Player })));

export function App() {
  const [settings] = useStore(settingsStore);
  const route = useRoute();
  const [section = '', param, param2] = route.path;

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
    case 'apprendre':
      page = param === 'guide' && param2 ? <Guide id={param2} /> : <Learn />;
      break;
    case 'histoires':
      page =
        param === 'coran' && param2 ? (
          <ProphetStoryView key={param2} id={param2} />
        ) : param === 'sunna' && param2 ? (
          <SunnahStoryView key={param2} id={param2} />
        ) : (
          <StoriesIndex />
        );
      break;
    case 'hadiths': {
      const id = (param in COLLECTIONS ? param : 'nawawi') as CollectionId;
      page = param2 ? <HadithView key={`${id}${param2}`} id={id} n={Number(param2)} /> : <HadithList id={id} />;
      break;
    }
    case 'quiz':
      page = <Quiz />;
      break;
    case 'serie':
      page = <Player key={`${param}-${param2}`} storyId={param ?? ''} episode={Math.max(0, (Number(param2) || 1) - 1)} />;
      break;
    case 'journee':
      page = <Goals />;
      break;
    case 'khatm':
      page = <Khatm />;
      break;
    case 'rattrapages':
      page = <Qada />;
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
