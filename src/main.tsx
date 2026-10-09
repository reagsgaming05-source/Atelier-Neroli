import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/amiri-quran/400.css';
import '@fontsource/amiri/latin-400.css';
import '@fontsource/amiri/latin-700.css';
import '@fontsource/amiri/latin-400-italic.css';
import '@fontsource/amiri/latin-ext-400.css';
import '@fontsource/amiri/latin-ext-700.css';
import './styles.css';
import { App } from './app';

render(<App />, document.getElementById('app')!);

// No service worker when the app is embedded in another page's frame (previews):
// frames usually cannot register one, and offline use only matters when installed.
const embedded = window.top !== window.self;
if ('serviceWorker' in navigator && import.meta.env.PROD && !embedded) {
  registerSW({ immediate: true });
}
