import { cn } from "@/lib/cn";

function Flower({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse key={deg} cx="0" cy="-16" rx="8" ry="16" transform={`rotate(${deg})`} />
      ))}
      <circle r="4.5" />
      {[30, 100, 170, 240, 310].map((deg) => (
        <line key={deg} x1="0" y1="0" x2="0" y2="-9" transform={`rotate(${deg})`} />
      ))}
    </g>
  );
}

function Leaf({ x, y, rotate = 0, scale = 1 }: { x: number; y: number; rotate?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 0 C 22 -30, 58 -30, 80 0 C 58 30, 22 30, 0 0 Z" />
      <path d="M4 0 L 74 0" strokeOpacity="0.6" />
    </g>
  );
}

/** Branche de fleur d'oranger stylisée, en trait (hérite de la couleur du texte). */
export function Blossom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 420" aria-hidden className={cn("h-auto w-full", className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 400 C 110 330, 160 290, 205 200 S 290 60, 380 30" />
      <path d="M205 200 C 240 190, 270 200, 300 230" />
      <path d="M150 300 C 130 270, 135 240, 160 215" />
      <Leaf x={120} y={330} rotate={-40} scale={0.9} />
      <Leaf x={170} y={250} rotate={20} scale={0.75} />
      <Leaf x={260} y={140} rotate={-60} scale={0.85} />
      <Leaf x={300} y={110} rotate={35} scale={0.65} />
      <Flower x={310} y={240} scale={1.15} />
      <Flower x={205} y={200} scale={0.7} />
      <Flower x={370} y={70} scale={0.55} />
      <circle cx="255" cy="260" r="6" />
      <circle cx="238" cy="275" r="4" />
      <circle cx="340" cy="120" r="5" />
    </svg>
  );
}
