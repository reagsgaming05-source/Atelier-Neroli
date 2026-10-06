/**
 * French narration with the device's own text-to-speech voices (Web Speech
 * API): free, offline on most phones, nothing to download.
 */

let chosen: SpeechSynthesisVoice | null = null;

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Prefers natural-sounding French voices when the device offers several. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  if (!voices.length) return null;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase() === 'fr-fr' ? 4 : 0) +
    (/google|natural|neural|premium|enhanced|amélie|amelie|thomas|audrey|aurélie|marie|daniel/i.test(v.name) ? 3 : 0) +
    (v.localService ? 1 : 0);
  return [...voices].sort((a, b) => score(b) - score(a))[0];
}

if (speechSupported()) {
  chosen = pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => (chosen = pickVoice()));
}

export interface SpeakHandle {
  cancel(): void;
}

/**
 * Speaks `text` and calls `onEnd` once, when it finishes or fails. If speech is
 * unavailable, waits for a reading time instead so the story still advances.
 */
export function speak(text: string, { rate = 1, onEnd }: { rate?: number; onEnd: () => void }): SpeakHandle {
  let done = false;
  let wait: number | undefined;
  const started = Date.now();
  const minimum = readingTime(text, rate) * 0.45;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(fallback);
    // A voice that fails or ends instantly must not skip the scene: leave time to read.
    const elapsed = Date.now() - started;
    if (elapsed < minimum) wait = window.setTimeout(onEnd, readingTime(text, rate) - elapsed);
    else onEnd();
  };
  // Safety net: some engines never fire "end"; never block the story for long.
  const fallback = window.setTimeout(finish, readingTime(text, rate) + 6000);

  if (!speechSupported()) {
    clearTimeout(fallback);
    const t = window.setTimeout(finish, readingTime(text, rate));
    return { cancel: () => ((done = true), clearTimeout(t)) };
  }

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = chosen?.lang ?? 'fr-FR';
  if (chosen) u.voice = chosen;
  u.rate = rate;
  u.onend = finish;
  u.onerror = (e) => {
    // "interrupted"/"canceled" come from our own cancel(); anything else: move on.
    if (e.error !== 'interrupted' && e.error !== 'canceled') finish();
  };
  speechSynthesis.speak(u);
  return {
    cancel() {
      done = true;
      clearTimeout(fallback);
      clearTimeout(wait);
      speechSynthesis.cancel();
    },
  };
}

/** Comfortable silent reading time for a text, in milliseconds. */
export function readingTime(text: string, rate = 1): number {
  return Math.max(3500, (text.length * 62) / rate);
}

export function stopSpeaking() {
  if (speechSupported()) speechSynthesis.cancel();
}
