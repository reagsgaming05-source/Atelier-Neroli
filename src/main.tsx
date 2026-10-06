import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/amiri-quran/400.css';
import './styles.css';
import { App } from './app';

render(<App />, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({ immediate: true });
}
