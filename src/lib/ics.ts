import { OBLIGATORY, PRAYER_NAMES, addDays, dayIn, dayKey, prayerTimes } from './prayer';
import type { Settings } from './settings';

/**
 * Builds an iCalendar file with one event per prayer and an alarm at the start
 * time. Imported into the phone's calendar, it gives dependable alerts even
 * when the app is closed — something a web app cannot do on its own.
 */
export function buildIcs(settings: Settings, days = 30, from: Date = new Date()): string {
  const place = settings.place;
  if (!place) throw new Error('Aucun lieu défini');
  const stamp = icsDate(from);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sakina//Horaires de priere//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`Prières — ${place.name}`)}`,
  ];
  const start = dayIn(place.tz, from);
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    const times = prayerTimes(settings, place, day);
    for (const id of OBLIGATORY) {
      const t = times[id];
      if (!t) continue;
      const name = PRAYER_NAMES[id];
      lines.push(
        'BEGIN:VEVENT',
        `UID:${dayKey(day)}-${id}-${place.lat.toFixed(2)}-${place.lng.toFixed(2)}@sakina`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDate(t)}`,
        `DTEND:${icsDate(new Date(t.getTime() + 15 * 60_000))}`,
        `SUMMARY:${escapeText(`${name.fr} ${name.ar}`)}`,
        `LOCATION:${escapeText(place.name)}`,
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(`C’est l’heure de ${name.fr}`)}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Folds lines longer than 75 octets as required by RFC 5545. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const max = out.length === 0 ? 75 : 74;
    if (size + len > max) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += len;
  }
  out.push(current);
  return out.join('\r\n ');
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
