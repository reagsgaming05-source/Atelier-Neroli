import { OBLIGATORY, PRAYER_NAMES, addDays, dayIn, formatTime, prayerTimes } from './prayer';
import type { Settings } from './settings';

/**
 * Prayer alerts while the app is open (in the foreground or recently
 * backgrounded). Browsers do not let a web app wake itself up at a precise
 * time once it is closed, so for reliable alerts the app also offers a
 * calendar export (see ics.ts) that the phone's calendar will ring for.
 */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

async function show(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = { body, tag, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, badge: `${import.meta.env.BASE_URL}icons/badge-96.png` };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* fall back to a page notification */
  }
  new Notification(title, options);
}

let audioCtx: AudioContext | null = null;

/** A soft three-note chime synthesised on the fly (no audio file needed). */
export function chime() {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const start = ctx.currentTime + 0.05;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + i * 0.35;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.7);
    });
  } catch {
    /* audio unavailable */
  }
}

let timers: number[] = [];

export function clearScheduled() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

/** Schedules alerts for the next 24 hours. Call again whenever settings change. */
export function scheduleAlerts(settings: Settings) {
  clearScheduled();
  const place = settings.place;
  if (!place || !settings.notify.enabled) return;
  const now = Date.now();
  const horizon = now + 24 * 3600 * 1000;
  const today = dayIn(place.tz);

  for (const day of [today, addDays(today, 1)]) {
    const times = prayerTimes(settings, place, day);
    for (const id of OBLIGATORY) {
      if (!settings.notify.prayers[id]) continue;
      const t = times[id];
      if (!t) continue;
      const name = PRAYER_NAMES[id];
      const at = t.getTime();
      if (at > now && at < horizon) {
        timers.push(
          window.setTimeout(() => {
            show(`${name.fr} · ${name.ar}`, `C’est l’heure de la prière (${formatTime(t, place.tz, settings.clock)}) — ${place.name}`, `prayer-${id}`);
            if (settings.notify.sound) chime();
          }, at - now),
        );
      }
      const before = settings.notify.before;
      if (before > 0 && at - before * 60_000 > now && at - before * 60_000 < horizon) {
        timers.push(
          window.setTimeout(() => {
            show(`${name.fr} dans ${before} min`, `${name.fr} à ${formatTime(t, place.tz, settings.clock)} — ${place.name}`, `before-${id}`);
          }, at - before * 60_000 - now),
        );
      }
    }
  }
}
