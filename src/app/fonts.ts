import localFont from "next/font/local";

export const cormorant = localFont({
  src: [
    { path: "../fonts/cormorant-normal-400-700.woff2", weight: "400 700", style: "normal" },
    { path: "../fonts/cormorant-italic-400-700.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

export const manrope = localFont({
  src: [{ path: "../fonts/manrope-normal-400-800.woff2", weight: "400 800", style: "normal" }],
  variable: "--font-manrope",
  display: "swap",
});
