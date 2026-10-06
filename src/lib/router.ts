import { useEffect, useState } from 'preact/hooks';

/** Hash-based routing: works from any sub-path and from the home screen. */
export interface Route {
  path: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { path: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(query) };
}

// Each history entry created inside the app carries its depth, so "back" can
// tell whether there is an in-app page to return to.
let index = 0;

function syncIndex() {
  const state = history.state as { i?: number } | null;
  if (typeof state?.i === 'number') index = state.i;
  else history.replaceState({ i: ++index }, '');
}

if (typeof window !== 'undefined') {
  const state = history.state as { i?: number } | null;
  if (typeof state?.i === 'number') index = state.i;
  else history.replaceState({ i: 0 }, '');
  window.addEventListener('hashchange', syncIndex);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(to: string, replace = false) {
  const hash = to.startsWith('#') ? to : `#${to}`;
  if (replace) {
    history.replaceState({ i: index }, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else location.hash = hash;
}

export function back(fallback = '/') {
  if (index > 0) history.back();
  else navigate(fallback, true);
}
