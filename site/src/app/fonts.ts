import localFont from "next/font/local";

// Les polices de la marque (outils/desktop/marque.json) : les mêmes que celles de l'application, auto-hébergées.
// Geist pour l'interface et le texte, Instrument Serif pour le titrage. Toutes deux sont sous licence SIL OFL.
export const instrumentSerif = localFont({
  src: [{ path: "../fonts/instrument-serif-latin-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const geist = localFont({
  src: [{ path: "../fonts/geist-latin-100-900.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-geist",
  display: "swap",
});
