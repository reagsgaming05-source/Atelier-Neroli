import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Icon, type IconName } from './Icon';
import { back } from '../lib/router';

export function TopBar({
  title,
  subtitle,
  backTo,
  actions,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ComponentChildren;
}) {
  return (
    <header class="topbar">
      {backTo !== undefined && (
        <button class="icon-btn" onClick={() => back(backTo)} aria-label="Retour">
          <Icon name="back" />
        </button>
      )}
      <h1 style={backTo === undefined ? { paddingInlineStart: '8px' } : undefined}>
        {title}
        {subtitle && <span class="sub">{subtitle}</span>}
      </h1>
      {actions}
    </header>
  );
}

const TABS: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: '#/', label: 'Accueil', icon: 'home', match: [''] },
  { href: '#/prieres', label: 'Prières', icon: 'clock', match: ['prieres', 'suivi'] },
  { href: '#/coran', label: 'Coran', icon: 'book', match: ['coran'] },
  { href: '#/apprendre', label: 'Apprendre', icon: 'learn', match: ['apprendre', 'histoires', 'hadiths', 'quiz', 'noms', 'serie'] },
  {
    href: '#/plus',
    label: 'Plus',
    icon: 'grid',
    match: ['plus', 'qibla', 'adhkar', 'tasbih', 'calendrier', 'zakat', 'reglages', 'apropos', 'lieu', 'rattrapages', 'journee', 'khatm'],
  },
];

export function BottomNav({ section }: { section: string }) {
  return (
    <nav class="nav" aria-label="Navigation principale">
      {TABS.map((t) => (
        <a key={t.href} href={t.href} aria-current={t.match.includes(section) ? 'page' : undefined}>
          <Icon name={t.icon} size={24} />
          {t.label}
        </a>
      ))}
    </nav>
  );
}

export function SectionTitle({ children, action }: { children: ComponentChildren; action?: ComponentChildren }) {
  return (
    <h2 class="section-title">
      <span>{children}</span>
      {action}
    </h2>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <input
      type="checkbox"
      role="switch"
      class="switch"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
    />
  );
}

export function Stepper({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  format = (v: number) => String(v),
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}) {
  return (
    <div class="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="Diminuer" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        <Icon name="minus" size={18} />
      </button>
      <output aria-live="polite">{format(value)}</output>
      <button type="button" aria-label="Augmenter" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

let showToastImpl: (msg: string) => void = () => {};

export function toast(msg: string) {
  showToastImpl(msg);
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    showToastImpl = (m) => {
      setMsg(m);
      clearTimeout(timer);
      timer = window.setTimeout(() => setMsg(null), 2600);
    };
    return () => clearTimeout(timer);
  }, []);
  return msg ? (
    <div class="toast" role="status">
      {msg}
    </div>
  ) : null;
}

export function Spinner() {
  return <div class="spinner" role="progressbar" aria-label="Chargement" />;
}

/** Vibrates briefly where supported (Android); silently ignored elsewhere. */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

export async function share(text: string, title = 'Sakina') {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copié dans le presse-papiers');
  } catch {
    toast('Impossible de partager');
  }
}
