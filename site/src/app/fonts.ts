import localFont from "next/font/local";

export const bricolage = localFont({
  src: [{ path: "../fonts/bricolage-normal-400-800.woff2", weight: "400 800", style: "normal" }],
  variable: "--font-bricolage",
  display: "swap",
});

export const manrope = localFont({
  src: [{ path: "../fonts/manrope-normal-400-800.woff2", weight: "400 800", style: "normal" }],
  variable: "--font-manrope",
  display: "swap",
});
