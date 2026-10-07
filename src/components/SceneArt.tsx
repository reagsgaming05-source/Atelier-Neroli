import type { JSX } from 'preact';
import type { Ground, Motif, Sky } from '../data/types';

/**
 * Paper-cut style illustrations built from a fixed vocabulary of skies,
 * landscapes and objects. Nothing here ever depicts a person, a prophet or an
 * angel: stories are shown through places, objects, animals and light.
 *
 * Drawn in a 300×360 portrait viewBox; the horizon sits at y = 232.
 */

interface Palette {
  sky: [string, string, string];
  far: string;
  mid: string;
  near: string;
  ground: [string, string];
  water: [string, string];
  leaf: string;
  ink: string;
  glow: string;
}

const PALETTES: Record<Sky, Palette> = {
  dawn: {
    sky: ['#2c2f62', '#b4648a', '#f5bf86'],
    far: '#7b5878',
    mid: '#5a4064',
    near: '#38284a',
    ground: ['#d79a73', '#a8645c'],
    water: ['#c98a8f', '#5d4f7a'],
    leaf: '#3f4f52',
    ink: '#2a1f38',
    glow: '#ffd99a',
  },
  day: {
    sky: ['#5fa8d8', '#a9d8ef', '#f2e8cf'],
    far: '#9fb5b8',
    mid: '#c79a63',
    near: '#9a6b3f',
    ground: ['#e9c98e', '#cf9e5e'],
    water: ['#4aa3c7', '#1f6f92'],
    leaf: '#3f7a52',
    ink: '#3b2a1e',
    glow: '#fff1c4',
  },
  dusk: {
    sky: ['#1d2550', '#8b3d6d', '#f2894c'],
    far: '#6a3f62',
    mid: '#4c2c52',
    near: '#2c1d3a',
    ground: ['#b06450', '#6b3a4a'],
    water: ['#b85d5f', '#43305a'],
    leaf: '#2f3a3f',
    ink: '#1f1529',
    glow: '#ffc27a',
  },
  night: {
    sky: ['#040a1d', '#0c1c3b', '#183457'],
    far: '#1d3150',
    mid: '#152640',
    near: '#0c1729',
    ground: ['#22334f', '#121e33'],
    water: ['#1c3b63', '#0a1a33'],
    leaf: '#10283a',
    ink: '#081120',
    glow: '#f3d27a',
  },
  storm: {
    sky: ['#161c27', '#323d4e', '#5a6879'],
    far: '#4a5565',
    mid: '#363f4d',
    near: '#232a35',
    ground: ['#5b5f66', '#3a3e45'],
    water: ['#3d5468', '#1b2733'],
    leaf: '#28343a',
    ink: '#14181f',
    glow: '#e8e2c4',
  },
};

const GOLD = '#d9b45a';

type Draw = (p: Palette, sky: Sky) => JSX.Element;

/** Seeded positions so star fields look the same on every render. */
function scatter(n: number, seed: number, w = 300, h = 200) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ x: rand() * w, y: rand() * h, r: 0.4 + rand() * 1.3, d: rand() * 4 }));
}

const lowSun = (sky: Sky) => sky === 'dawn' || sky === 'dusk';

const MOTIF_DRAW: Record<Motif, Draw> = {
  // ── animals ──
  dove: () => (
    <g class="anim-fly">
      <ellipse cx="96" cy="92" rx="13" ry="6.5" fill="#f6f2e8" />
      <circle cx="108" cy="88" r="4.6" fill="#f6f2e8" />
      <path d="M112 88l7 2-7 2z" fill="#d9a05a" />
      <path d="M92 90q-8-22-26-26 8 20 14 30z" fill="#e8e2d2" class="anim-bob" />
      <path d="M96 92q10-22 30-20-10 14-20 24z" fill="#fbf8f0" />
      <path d="M84 94l-14 6 16 0z" fill="#e8e2d2" />
    </g>
  ),
  wolf: () => (
    <g fill="#5d606a">
      <path d="M52 296q4-22 26-22 8-10 20-6l12-8 2 12q10 2 12 10l-10 4-6 20h-6l-2-14h-24l-2 14h-6l-2-14q-10 2-14 4z" />
      <path d="M52 296q-12-6-18-18 14 6 22 12z" />
      <path d="M108 262l4-12 6 10z" />
      <circle cx="116" cy="270" r="1.5" fill="#f1e6a8" />
    </g>
  ),
  serpent: () => (
    <g class="anim-sway" style={{ transformOrigin: '150px 300px' }}>
      <path d="M92 300q22-30 44-8t40-18q14-8 18 10" fill="none" stroke="#5f7d4c" stroke-width="9" stroke-linecap="round" />
      <path d="M92 300q22-30 44-8t40-18q14-8 18 10" fill="none" stroke="#86a86a" stroke-width="2.4" stroke-dasharray="3 7" stroke-linecap="round" />
      <path d="M194 284q8-14 18-12l6 4-8 6z" fill="#5f7d4c" />
      <path d="M218 276l8 2-6 3" fill="none" stroke="#c0392b" stroke-width="1.2" />
      <circle cx="206" cy="276" r="1.5" fill="#f4d77a" />
    </g>
  ),
  locusts: (p) => (
    <g fill={p.ink} opacity="0.85" class="anim-fly">
      {scatter(26, 21, 250, 170).map((b, i) => (
        <g key={i} transform={`translate(${25 + b.x} ${40 + b.y}) rotate(${(i * 37) % 60 - 30})`}>
          <ellipse cx="0" cy="0" rx="4.4" ry="1.6" fill="#8d7a3a" />
          <path d="M-1 0l-3-5 5 3z" fill="#b7a45a" opacity="0.8" />
          <path d="M-4 0l-4 2" stroke="#8d7a3a" stroke-width="0.8" />
        </g>
      ))}
    </g>
  ),
  dog: (p) => (
    <g fill={p.ink}>
      <path d="M214 304q2-20 18-24l-4-18 10 8q8-4 14 2l4 6-8 4q-2 14-8 22z" />
      <path d="M248 270l8-8 2 10z" />
      <path d="M214 304q-14 0-16-10 10 6 16 4z" />
      <circle cx="250" cy="274" r="1.3" fill="#f1e6a8" />
    </g>
  ),
  raven: () => (
    <g class="anim-fly">
      <path d="M170 124q16-16 36-8l14-4-8 12q-12 18-38 12z" fill="#16181f" />
      <path d="M180 120q8-24 32-24-8 10-12 24z" fill="#242836" />
      <path d="M220 112l10 2-10 4z" fill="#3a3f52" />
      <circle cx="214" cy="112" r="1.2" fill="#e6e6ef" />
    </g>
  ),
  // ── objects ──
  planks: (p) => (
    <g>
      <g class="anim-grow" style={{ transformOrigin: '150px 270px' }}>
      <path d="M72 262q28 12 78 12t78-12" fill="none" stroke={p.near} stroke-width="4" />
      {[88, 104, 120, 136, 150, 164, 180, 196, 212].map((x, i) => (
        <path key={i} d={`M${x} 270q${(i - 4) * 1.4}-${26 + (i % 3) * 4} ${(i - 4) * 4}-${50 + (i % 2) * 6}`} fill="none" stroke={p.mid} stroke-width="3.4" stroke-linecap="round" />
      ))}
      <path d="M72 262l-8-26M228 262l10-26" stroke={p.near} stroke-width="4" stroke-linecap="round" />
      </g>
      <g transform="translate(40 292) rotate(-5)">
        {[0, 7, 14].map((y) => (
          <rect key={y} x="0" y={y} width="62" height="5.5" rx="1" fill={y === 7 ? '#b98c58' : '#a77d4b'} />
        ))}
      </g>
      <g transform="translate(200 296) rotate(4)">
        {[0, 7].map((y) => (
          <rect key={y} x="0" y={y} width="56" height="5.5" rx="1" fill="#b98c58" />
        ))}
      </g>
    </g>
  ),
  web: (p) => (
    <g stroke={p.glow} stroke-width="0.8" fill="none" opacity="0.8">
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return <line key={i} x1="150" y1="150" x2={150 + Math.cos(a) * 54} y2={150 + Math.sin(a) * 54} />;
      })}
      {[14, 26, 40, 54].map((r) => (
        <circle key={r} cx="150" cy="150" r={r} stroke-dasharray="5 3" />
      ))}
      <circle cx="170" cy="140" r="2.2" fill={p.ink} stroke="none" />
    </g>
  ),
  basket: () => (
    <g>
      <ellipse cx="150" cy="300" rx="38" ry="9" fill="#00000030" />
      <path d="M112 280q4 24 38 24t38-24z" fill="#b5894f" />
      <ellipse cx="150" cy="280" rx="38" ry="9" fill="#d3a766" />
      <ellipse cx="150" cy="281" rx="31" ry="6" fill="#8a6434" />
      {[122, 136, 150, 164, 178].map((x) => (
        <path key={x} d={`M${x} 286q-2 10 0 16`} stroke="#8a6434" stroke-width="1.2" fill="none" />
      ))}
      <path d="M118 292q32 8 64 0M122 300q28 6 56 0" stroke="#8a6434" stroke-width="1.2" fill="none" />
    </g>
  ),
  scales: (p) => (
    <g class="anim-sway" style={{ transformOrigin: '150px 214px' }}>
      <rect x="147" y="212" width="6" height="88" fill={GOLD} />
      <rect x="128" y="298" width="44" height="6" rx="2" fill={GOLD} />
      <path d="M96 218l108-4" stroke={GOLD} stroke-width="4" stroke-linecap="round" />
      <circle cx="150" cy="215" r="6" fill={GOLD} />
      {[[96, 218], [204, 214]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x} ${y}l-20 40M${x} ${y}l20 40`} stroke={p.ink} stroke-width="1" />
          <path d={`M${x - 24} ${y + 40}q24 16 48 0z`} fill={GOLD} />
        </g>
      ))}
    </g>
  ),
  goblet: (p) => (
    <g>
      <circle cx="150" cy="268" r="34" fill={p.glow} opacity="0.16" />
      <path d="M130 244h40q0 24-20 26t-20-26z" fill={GOLD} />
      <rect x="147" y="270" width="6" height="18" fill={GOLD} />
      <ellipse cx="150" cy="292" rx="16" ry="4.5" fill="#b8932f" />
      <path d="M130 244h40" stroke="#f3dc8c" stroke-width="2" />
    </g>
  ),
  bread: () => (
    <g>
      <path d="M92 296h116l-8 8H100z" fill="#d6c7a3" />
      {[[116, 288, 17], [150, 285, 19], [184, 288, 17]].map(([x, y, r], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill="#c68a46" />
          <path d={`M${x - r * 0.5} ${y - 3}l5 -3M${x} ${y - 4}l5 -3M${x + r * 0.45} ${y - 3}l5 -3`} stroke="#8d5c28" stroke-width="1.4" stroke-linecap="round" />
        </g>
      ))}
    </g>
  ),
  flames: (p) => (
    <g>
      <ellipse cx="150" cy="292" rx="64" ry="12" fill={p.glow} opacity="0.2" />
      <circle cx="150" cy="250" r="70" fill="#ff8a30" opacity="0.14" />
      <g class="anim-flicker" style={{ transformOrigin: '150px 300px' }}>
        <path d="M96 300q-6-34 12-52 2 14 12 20-4-26 14-50 4 22 18 34 2-14 8-22 20 28 4 70z" fill="#ff5a2a" />
        <path d="M112 300q-4-26 10-40 2 12 10 14-2-18 12-34 4 16 14 26 12 12 6 34z" fill="#ff9a3c" />
        <path d="M130 300q-2-16 8-26 2 8 8 10 0-10 8-18 6 14 4 34z" fill="#ffd56a" />
      </g>
      <path d="M92 302h116" stroke={p.ink} stroke-width="5" stroke-linecap="round" />
    </g>
  ),
  rock: (p) => (
    <g>
      <path d="M118 306l-14-44 26-34 30 10 22-18 34 38-6 48z" fill={p.mid} />
      <path d="M130 228l30 10 22-18-12 52-26 14z" fill={p.near} opacity="0.7" />
      <path d="M118 306l-14-44 26-34-6 50z" fill={p.far} opacity="0.55" />
      <path d="M160 238l-4 24" stroke={p.ink} stroke-width="1.4" opacity="0.5" />
    </g>
  ),
  rope: (p) => (
    <g class="anim-sway" style={{ transformOrigin: '150px 120px' }}>
      <line x1="150" y1="110" x2="150" y2="262" stroke="#b79562" stroke-width="3.6" />
      <line x1="150" y1="110" x2="150" y2="262" stroke="#7a5d34" stroke-width="3.6" stroke-dasharray="2 4" />
      <circle cx="150" cy="268" r="7" fill="none" stroke="#b79562" stroke-width="3" />
      <circle cx="150" cy="268" r="1.6" fill={p.ink} />
    </g>
  ),
  jar: () => (
    <g>
      <ellipse cx="226" cy="302" rx="24" ry="6" fill="#00000030" />
      <path d="M206 262q-8 22 4 40 16 8 32 0 12-18 4-40l-6-8 4-6h-34l4 6z" fill="#b86f3e" />
      <path d="M214 268q-4 14 0 28" stroke="#d99966" stroke-width="3" fill="none" opacity="0.7" />
      <ellipse cx="226" cy="248" rx="16" ry="4" fill="#7a431f" />
      <path d="M208 270q18 6 36 0" stroke="#8a4d26" stroke-width="1.5" fill="none" />
    </g>
  ),
  sun: (p, sky) => {
    const y = lowSun(sky) ? 205 : 92;
    return (
      <g class={sky === 'dawn' ? 'anim-sunrise' : sky === 'dusk' ? 'anim-sunset' : ''}>
        <circle cx="205" cy={y} r="58" fill={p.glow} opacity="0.18" />
        <circle cx="205" cy={y} r="34" fill={p.glow} opacity="0.35" />
        <circle cx="205" cy={y} r="22" fill={p.glow} />
      </g>
    );
  },
  moon: (p) => (
    <g>
      <circle cx="78" cy="78" r="40" fill={p.glow} opacity="0.1" />
      <circle cx="78" cy="78" r="20" fill="#f4ecd2" />
      <circle cx="72" cy="72" r="3" fill="#ddd2b4" />
      <circle cx="84" cy="84" r="4" fill="#ddd2b4" />
    </g>
  ),
  crescent: (p) => (
    <g>
      <circle cx="226" cy="74" r="34" fill={p.glow} opacity="0.12" />
      <path d="M232 56a20 20 0 1 0 0 36 16 16 0 1 1 0-36z" fill={GOLD} />
    </g>
  ),
  stars: () => (
    <g>
      {scatter(46, 7, 300, 190).map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff6d8" class="anim-twinkle" style={{ animationDelay: `${s.d}s` }} />
      ))}
    </g>
  ),
  'bright-star': (p) => (
    <g class="anim-pulse" style={{ transformOrigin: '150px 64px' }}>
      <circle cx="150" cy="64" r="26" fill={p.glow} opacity="0.2" />
      <path d="M150 40l5 19 19 5-19 5-5 19-5-19-19-5 19-5z" fill={GOLD} />
    </g>
  ),
  clouds: () => (
    <g fill="#fff" opacity="0.75" class="anim-drift">
      <path d="M30 70a14 14 0 0 1 26-6 12 12 0 0 1 22 8H24a9 9 0 0 1 6-2z" />
      <path d="M170 46a16 16 0 0 1 30-6 13 13 0 0 1 24 9h-60a10 10 0 0 1 6-3z" />
      <path d="M220 120a12 12 0 0 1 22-5 10 10 0 0 1 18 7h-44a8 8 0 0 1 4-2z" opacity="0.7" />
    </g>
  ),
  'dark-clouds': (p) => (
    <g class="anim-drift-slow">
      <path d="M-20 70q30-40 70-20 25-30 65-8 30-26 70-2 40-18 70 8 40 0 60 40H-20z" fill={p.near} opacity="0.92" />
      <path d="M-10 40q40-30 80-6 30-24 70 0 40-24 80 4 30-6 90 14V0H-10z" fill={p.mid} opacity="0.9" />
    </g>
  ),
  rain: () => (
    <g stroke="#c9d6e6" stroke-width="1.2" opacity="0.55" class="anim-rain">
      {scatter(60, 11, 340, 360).map((s, i) => (
        <line key={i} x1={s.x - 20} y1={s.y - 20} x2={s.x - 26} y2={s.y - 4} />
      ))}
    </g>
  ),
  lightning: () => (
    <path d="M190 30l-22 54h18l-26 58 46-70h-20l20-42z" fill="#fff7c2" class="anim-flash" />
  ),
  wind: () => (
    <g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.5" class="anim-wind">
      <path d="M-10 120q60-20 120 0t130-6" />
      <path d="M20 150q50-16 110 2t110-10" />
      <path d="M-20 180q70-18 130 0t160-4" />
    </g>
  ),
  flood: (p) => (
    <g class="anim-rise">
      <rect x="-10" y="196" width="320" height="180" fill={p.water[1]} />
      <path d="M-10 200q25-10 50 0t50 0 50 0 50 0 50 0 50 0 50 0v20h-350z" fill={p.water[0]} class="anim-wave" />
      <path d="M-30 236q25-8 50 0t50 0 50 0 50 0 50 0 50 0 50 0v10h-350z" fill={p.water[0]} opacity="0.5" class="anim-wave-slow" />
    </g>
  ),
  'sea-split': (p) => (
    <g>
      <path d="M-10 120q40 10 60 0 30 40 60 112l-20 140H-10z" fill={p.water[0]} />
      <path d="M310 120q-40 10-60 0-30 40-60 112l20 140h100z" fill={p.water[0]} />
      <path d="M-10 150q40 8 56 2 22 34 50 84l-18 136H-10z" fill={p.water[1]} opacity="0.8" />
      <path d="M310 150q-40 8-56 2-22 34-50 84l18 136h88z" fill={p.water[1]} opacity="0.8" />
      <path d="M128 232h44l30 140h-104z" fill={p.ground[0]} />
    </g>
  ),
  ark: (p) => (
    <g class="anim-sail">
      <g class="anim-bob">
        <path d="M70 222h160l-22 30H92z" fill={p.near} />
        <rect x="110" y="196" width="80" height="26" rx="2" fill={p.mid} />
        <path d="M104 198l46-22 46 22z" fill={p.near} />
        <rect x="128" y="204" width="10" height="10" fill={p.glow} opacity="0.7" />
        <rect x="162" y="204" width="10" height="10" fill={p.glow} opacity="0.7" />
      </g>
    </g>
  ),
  boat: (p) => (
    <g class="anim-bob">
      <path d="M112 240h76l-12 16h-52z" fill={p.near} />
      <line x1="150" y1="240" x2="150" y2="196" stroke={p.near} stroke-width="2.5" />
      <path d="M152 198l26 36h-26z" fill="#f2ead7" opacity="0.9" />
    </g>
  ),
  'big-fish': (p) => (
    <g class="anim-swim">
      <path d="M70 300q50-40 130-10l30-22-6 30 10 26-34-16q-70 30-130-8z" fill={p.far} stroke={p.glow} stroke-opacity="0.35" stroke-width="1.2" />
      <circle cx="94" cy="296" r="2.5" fill={p.glow} />
    </g>
  ),
  spring: (p) => (
    <g>
      <path d="M118 300q32-14 64 0-32 12-64 0z" fill={p.water[0]} />
      <g fill={p.water[0]} class="anim-drops">
        <circle cx="150" cy="282" r="2.4" />
        <circle cx="142" cy="276" r="1.8" />
        <circle cx="158" cy="274" r="1.8" />
      </g>
      <path d="M150 300q-2-16 0-24" stroke={p.water[0]} stroke-width="3" fill="none" opacity="0.8" />
    </g>
  ),
  light: (p) => (
    <g opacity="0.55" class="anim-rays" style={{ transformOrigin: '150px -40px' }}>
      {[-34, -18, -6, 6, 18, 34].map((a, i) => (
        <path key={i} d="M150 -40l-12 420h24z" fill={p.glow} opacity={0.18 + (i % 2) * 0.1} transform={`rotate(${a} 150 -40)`} />
      ))}
    </g>
  ),
  fire: (p) => (
    <g>
      <ellipse cx="150" cy="300" rx="90" ry="30" fill={p.glow} opacity="0.18" />
      <g class="anim-flicker" style={{ transformOrigin: '150px 312px' }}>
        <path d="M150 196c18 30 52 46 46 86s-30 34-46 34-50-6-48-40 30-40 30-60c8 10 10 18 18 22-6-16-6-28 0-42z" fill="#e8642c" />
        <path d="M150 238c10 18 30 28 26 52s-16 22-26 22-28-4-26-24 18-22 16-36c6 6 8 10 10 12z" fill="#f6b33a" />
        <path d="M150 272c6 8 14 14 12 26s-8 12-12 12-14-2-12-12 8-12 12-26z" fill="#ffe9a3" />
      </g>
    </g>
  ),
  lamp: (p) => (
    <g>
      <g transform="translate(64 6)">
        <circle cx="150" cy="276" r="44" fill={p.glow} opacity="0.16" class="anim-pulse" style={{ transformOrigin: '150px 276px' }} />
        <path d="M112 300q38 18 76 0l-8-10h-60z" fill={GOLD} />
        <path d="M180 292q22-6 22-20" stroke={GOLD} stroke-width="3" fill="none" />
        <path d="M150 288c-6-8-6-18 0-28 6 10 6 20 0 28z" fill="#ffd36b" class="anim-flicker" style={{ transformOrigin: '150px 288px' }} />
      </g>
    </g>
  ),
  palm: (p) => <Palm x={236} h={120} color={p.leaf} />,
  palms: (p) => (
    <g>
      <Palm x={58} h={104} color={p.leaf} />
      <Palm x={238} h={126} color={p.leaf} />
      <Palm x={268} h={92} color={p.leaf} />
    </g>
  ),
  tree: (p) => (
    <g>
      <rect x="70" y="226" width="10" height="64" fill={p.near} />
      <circle cx="75" cy="208" r="34" fill={p.leaf} />
      <circle cx="54" cy="226" r="22" fill={p.leaf} />
      <circle cx="98" cy="224" r="24" fill={p.leaf} />
    </g>
  ),
  withered: (p) => (
    <g stroke={p.near} stroke-width="5" stroke-linecap="round" fill="none">
      <path d="M70 300v-70l-18-26M70 250l20-24M70 234l-10-30" />
      <path d="M220 300v-58l16-22M220 262l-18-18M220 246l8-26" />
      <path d="M150 300v-40l-12-16M150 276l12-14" opacity="0.8" />
    </g>
  ),
  wheat: () => (
    <g fill={GOLD}>
      {[30, 62, 94, 206, 238, 270].map((x, i) => (
        <g key={i} class="anim-sway" style={{ transformOrigin: `${x}px 360px`, animationDelay: `${i * 0.3}s` }}>
          <line x1={x} y1="360" x2={x} y2="282" stroke={GOLD} stroke-width="2" />
          {[0, 1, 2, 3, 4].map((k) => (
            <ellipse key={k} cx={x + (k % 2 ? 4 : -4)} cy={290 - k * 6} rx="3.5" ry="6" transform={`rotate(${k % 2 ? 25 : -25} ${x} ${290 - k * 6})`} />
          ))}
        </g>
      ))}
    </g>
  ),
  gourd: (p) => (
    <g fill={p.leaf}>
      <path d="M90 320q60-70 120 0" stroke={p.leaf} stroke-width="4" fill="none" />
      <path d="M110 284q-26-20-4-40 24 8 4 40z" />
      <path d="M150 262q-6-34 24-36 8 28-24 36z" />
      <path d="M188 286q26-20 8-42-26 10-8 42z" />
      <path d="M130 300q-30 0-30-22 28-6 30 22z" />
    </g>
  ),
  dates: () => (
    <g fill="#8a4b2a" class="anim-fall">
      <ellipse cx="226" cy="150" rx="3" ry="4.5" />
      <ellipse cx="236" cy="164" rx="3" ry="4.5" />
      <ellipse cx="220" cy="176" rx="3" ry="4.5" />
      <ellipse cx="244" cy="146" rx="3" ry="4.5" />
    </g>
  ),
  kaaba: (p) => (
    <g>
      <ellipse cx="150" cy="292" rx="80" ry="12" fill={p.glow} opacity="0.12" />
      <path d="M100 230l50-12 50 12v62l-50 10-50-10z" fill="#111" />
      <path d="M150 218v84" stroke="#000" stroke-width="1" />
      <path d="M100 244l50-11 50 11v8l-50-11-50 11z" fill={GOLD} />
      <rect x="160" y="262" width="12" height="22" fill={GOLD} opacity="0.85" />
    </g>
  ),
  tent: (p) => (
    <g>
      <path d="M30 300l42-52 42 52z" fill={p.mid} />
      <path d="M72 248l-12 52h24z" fill={p.near} />
      <path d="M72 248l-6-10" stroke={p.near} stroke-width="2" />
    </g>
  ),
  house: (p) => (
    <g>
      <rect x="196" y="252" width="62" height="48" fill={p.mid} />
      <rect x="192" y="248" width="70" height="6" fill={p.near} />
      <path d="M220 300v-22a7 7 0 0 1 14 0v22z" fill={p.near} />
      <rect x="244" y="264" width="8" height="10" fill={p.glow} opacity="0.6" />
    </g>
  ),
  palace: (p) => (
    <g>
      <rect x="70" y="236" width="160" height="66" fill={p.mid} />
      <path d="M118 236a32 32 0 0 1 64 0z" fill={p.near} />
      <rect x="146" y="188" width="8" height="18" fill={GOLD} />
      <rect x="62" y="216" width="22" height="86" fill={p.near} />
      <rect x="216" y="216" width="22" height="86" fill={p.near} />
      {[92, 116, 140, 164, 188].map((x) => (
        <path key={x} d={`M${x} 302v-30a8 8 0 0 1 16 0v30z`} fill={p.near} />
      ))}
    </g>
  ),
  tower: (p) => (
    <g>
      <path d="M190 300l8-150h36l8 150z" fill={p.mid} />
      <rect x="194" y="140" width="44" height="12" fill={p.near} />
      {[170, 200, 230, 260].map((y) => (
        <rect key={y} x="210" y={y} width="12" height="14" fill={p.glow} opacity="0.4" />
      ))}
    </g>
  ),
  ruins: (p) => (
    <g fill={p.mid}>
      <rect x="60" y="246" width="16" height="56" />
      <path d="M100 302v-38l16-8v46z" />
      <rect x="180" y="226" width="16" height="76" />
      <path d="M214 302v-24l20 6v18z" />
      <path d="M40 302l20-10 30 6 40-8 30 10 40-6 40 8v4H40z" fill={p.near} />
      <rect x="172" y="220" width="32" height="8" fill={p.near} transform="rotate(-8 188 224)" />
    </g>
  ),
  pillars: (p) => (
    <g fill={p.mid}>
      {[60, 110, 160, 210].map((x) => (
        <g key={x}>
          <rect x={x} y="216" width="18" height="86" />
          <rect x={x - 4} y="210" width="26" height="8" fill={p.near} />
        </g>
      ))}
      <rect x="52" y="200" width="196" height="12" fill={p.near} />
    </g>
  ),
  wall: (p) => (
    <g>
      <rect x="40" y="170" width="220" height="132" fill="#5b4a3e" />
      {[0, 1, 2, 3, 4, 5].map((r) =>
        [0, 1, 2, 3, 4, 5, 6].map((c) => (
          <rect key={`${r}-${c}`} x={40 + c * 32 + (r % 2) * 16} y={172 + r * 22} width="30" height="20" fill="#7a6250" opacity="0.6" />
        )),
      )}
      <rect x="40" y="166" width="220" height="8" fill="#b06a3a" />
      <rect x="40" y="166" width="220" height="136" fill={p.glow} opacity="0.08" />
    </g>
  ),
  prison: (p) => (
    <g>
      <rect x="0" y="0" width="300" height="360" fill={p.ink} opacity="0.55" />
      <rect x="90" y="70" width="120" height="110" fill="none" stroke={p.ink} stroke-width="10" />
      {[110, 130, 150, 170, 190].map((x) => (
        <line key={x} x1={x} y1="70" x2={x} y2="180" stroke={p.ink} stroke-width="5" />
      ))}
    </g>
  ),
  well: (p) => (
    <g>
      <ellipse cx="150" cy="268" rx="40" ry="10" fill={p.ink} />
      <path d="M110 268v30q40 14 80 0v-30q-40 14-80 0z" fill={p.mid} />
      <path d="M116 268v-44M184 268v-44" stroke={p.near} stroke-width="5" />
      <rect x="110" y="220" width="80" height="6" fill={p.near} />
      <line x1="150" y1="226" x2="150" y2="262" stroke={p.near} stroke-width="1.5" />
    </g>
  ),
  'cave-mouth': (p) => (
    <g>
      <path d="M20 302q20-130 130-150 110 20 130 150z" fill={p.mid} />
      <path d="M112 302q4-70 38-80 34 10 38 80z" fill={p.ink} />
    </g>
  ),
  throne: () => (
    <g fill={GOLD}>
      <path d="M118 302v-62q32-30 64 0v62h-10v-26h-44v26z" />
      <rect x="112" y="268" width="76" height="10" rx="2" />
      <circle cx="150" cy="232" r="5" fill="#fff4cc" />
    </g>
  ),
  camel: (p) => (
    <g fill={p.near}>
      <path d="M170 280q4-26 24-26 10-14 22 0 14-6 18 14l10-20q6-8 12-2l-4 4-12 26-4 30h-6l-2-24h-36l-4 24h-6l-2-24q-8 0-10-2z" />
    </g>
  ),
  birds: (p) => (
    <g fill="none" stroke={p.ink} stroke-width="2" stroke-linecap="round" class="anim-fly">
      {scatter(9, 3, 240, 120).map((b, i) => (
        <path key={i} d={`M${30 + b.x} ${50 + b.y}q6-6 12 0q6-6 12 0`} />
      ))}
    </g>
  ),
  hoopoe: (p) => (
    <g class="anim-bob">
      <path d="M190 210q16-14 34-4l14-6-8 10q-10 18-34 14z" fill="#c98a3a" />
      <path d="M206 202l-6-14 8 6 2-10 4 12 6-6-4 12z" fill="#e1a14a" />
      <path d="M190 210l-12 4 12 2z" fill={p.ink} />
      <path d="M210 214l20 6-12-12z" fill={p.ink} opacity="0.6" />
    </g>
  ),
  ants: (p) => (
    <g fill={p.ink}>
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i} class="anim-march" style={{ animationDelay: `${i * 0.2}s` }}>
          <ellipse cx={30 + i * 18} cy={318 - (i % 3) * 4} rx="3" ry="2" />
          <ellipse cx={34 + i * 18} cy={318 - (i % 3) * 4} rx="2" ry="1.6" />
        </g>
      ))}
    </g>
  ),
  sheep: () => (
    <g>
      {[[60, 300], [96, 306], [216, 302]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="14" ry="9" fill="#f1ece0" />
          <ellipse cx={x + 13} cy={y - 3} rx="5" ry="4" fill="#3a2f2a" />
          <line x1={x - 6} y1={y + 8} x2={x - 6} y2={y + 14} stroke="#3a2f2a" stroke-width="2" />
          <line x1={x + 6} y1={y + 8} x2={x + 6} y2={y + 14} stroke="#3a2f2a" stroke-width="2" />
        </g>
      ))}
    </g>
  ),
  elephant: (p) => (
    <g fill={p.near} transform="translate(-48 4)">
      <path d="M60 300v-30q0-34 44-34h30q24 0 28 26l4 22q2 14-6 14l-4-18-6 4v20h-12v-18h-48v18H78v-18h-6v14z" />
      <path d="M164 262q14 6 12 30" stroke={p.near} stroke-width="8" fill="none" stroke-linecap="round" />
    </g>
  ),
  cows: (p) => (
    <g fill={p.near}>
      {[[50, 298], [190, 304]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y - 16} width="46" height="22" rx="8" />
          <rect x={x + 40} y={y - 22} width="16" height="14" rx="5" />
          {[4, 14, 30, 40].map((dx) => (
            <rect key={dx} x={x + dx} y={y + 4} width="4" height="14" />
          ))}
        </g>
      ))}
    </g>
  ),
  staff: (p) => (
    <g>
      <circle cx="232" cy="226" r="40" fill={p.glow} opacity="0.14" />
      <path d="M232 312V198q0-14 12-14" stroke="#7a5532" stroke-width="6" fill="none" stroke-linecap="round" />
    </g>
  ),
  tablets: (p) => (
    <g>
      <circle cx="150" cy="262" r="58" fill={p.glow} opacity="0.12" />
      <path d="M104 304v-56a20 20 0 0 1 40 0v56z" fill="#cfc6b3" />
      <path d="M156 304v-56a20 20 0 0 1 40 0v56z" fill="#cfc6b3" />
      {[262, 274, 286].map((y) => (
        <g key={y} stroke="#8f8676" stroke-width="2">
          <line x1="112" y1={y} x2="136" y2={y} />
          <line x1="164" y1={y} x2="188" y2={y} />
        </g>
      ))}
    </g>
  ),
  book: (p) => (
    <g>
      <circle cx="150" cy="270" r="56" fill={p.glow} opacity="0.16" class="anim-pulse" style={{ transformOrigin: '150px 270px' }} />
      <path d="M150 300q-30-14-62-6v-44q32-8 62 6z" fill="#f2ead7" />
      <path d="M150 300q30-14 62-6v-44q-32-8-62 6z" fill="#e6dcc3" />
      <path d="M150 256v44" stroke={GOLD} stroke-width="2" />
    </g>
  ),
  scroll: () => (
    <g>
      <rect x="104" y="262" width="92" height="34" fill="#efe4c8" />
      <rect x="98" y="258" width="10" height="42" rx="5" fill="#b48a52" />
      <rect x="192" y="258" width="10" height="42" rx="5" fill="#b48a52" />
      {[270, 278, 286].map((y) => (
        <line key={y} x1="116" y1={y} x2="184" y2={y} stroke="#b9a986" stroke-width="2" />
      ))}
    </g>
  ),
  coins: () => (
    <g>
      {scatter(16, 5, 90, 30).map((c, i) => (
        <ellipse key={i} cx={105 + c.x} cy={286 + c.y} rx="8" ry="4" fill={i % 3 ? GOLD : '#f0d27c'} stroke="#a07f2c" stroke-width="0.8" />
      ))}
    </g>
  ),
  gold: () => (
    <g>
      <path d="M100 304q50-40 100 0z" fill={GOLD} />
      {scatter(10, 9, 90, 24).map((s, i) => (
        <circle key={i} cx={105 + s.x} cy={282 + s.y} r={1.5 + s.r} fill="#fff4cc" class="anim-twinkle" style={{ animationDelay: `${s.d}s` }} />
      ))}
    </g>
  ),
  shirt: () => (
    <g>
      <path d="M118 236l20-10h24l20 10 14 22-16 8-6-10v62h-48v-62l-6 10-16-8z" fill="#efe6d2" />
      <path d="M140 226q10 10 20 0" stroke="#c9bb98" stroke-width="2" fill="none" />
    </g>
  ),
  cradle: (p) => (
    <g>
      <circle cx="150" cy="268" r="58" fill={p.glow} opacity="0.14" />
      <path d="M100 262q50 50 100 0z" fill="#b48a52" />
      <path d="M96 304q54-30 108 0" stroke="#7a5532" stroke-width="5" fill="none" />
      <path d="M112 262q38 24 76 0" fill="#efe6d2" />
    </g>
  ),
  table: (p) => (
    <g>
      <circle cx="150" cy="250" r="66" fill={p.glow} opacity="0.12" />
      <rect x="80" y="262" width="140" height="10" rx="3" fill="#b48a52" />
      <rect x="92" y="272" width="8" height="34" fill="#7a5532" />
      <rect x="200" y="272" width="8" height="34" fill="#7a5532" />
      <ellipse cx="120" cy="258" rx="16" ry="5" fill="#efe6d2" />
      <ellipse cx="180" cy="258" rx="16" ry="5" fill="#efe6d2" />
      <circle cx="150" cy="254" r="8" fill="#c0603a" />
    </g>
  ),
  stones: (p) => (
    <g fill={p.ink} class="anim-fall">
      {scatter(14, 13, 260, 180).map((s, i) => (
        <circle key={i} cx={20 + s.x} cy={20 + s.y} r={1.6 + s.r} />
      ))}
    </g>
  ),
  path: (p) => <path d="M140 232h20l70 140H70z" fill={p.ground[0]} opacity="0.85" />,
  footprints: (p) => (
    <g fill={p.ink} opacity="0.45">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={150 + (i % 2 ? 8 : -8) + i * 3} cy={348 - i * 18} rx={4 - i * 0.4} ry={7 - i * 0.7} />
      ))}
    </g>
  ),
  key: () => (
    <g fill={GOLD}>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${100 + i * 34} ${266 + (i % 2) * 10}) rotate(${-30 + i * 25})`}>
          <circle cx="0" cy="0" r="9" fill="none" stroke={GOLD} stroke-width="4" />
          <rect x="7" y="-2" width="28" height="4" />
          <rect x="28" y="2" width="4" height="7" />
          <rect x="20" y="2" width="4" height="5" />
        </g>
      ))}
    </g>
  ),
};

function Palm({ x, h, color }: { x: number; h: number; color: string }) {
  const top = 300 - h;
  return (
    <g class="anim-sway" style={{ transformOrigin: `${x}px 300px` }}>
      <path d={`M${x - 3} 300q-4-${h / 2} 4-${h}l4 2q-6 ${h / 2} 0 ${h - 2}z`} fill={color} />
      {[-150, -110, -60, -20, 20].map((a, i) => (
        <path key={i} d={`M${x + 1} ${top}q20-10 40 6q-22-4-40-2z`} fill={color} transform={`rotate(${a + 90} ${x + 1} ${top})`} />
      ))}
    </g>
  );
}

const GROUNDS: Record<Ground, (p: Palette) => JSX.Element | null> = {
  none: () => null,
  desert: (p) => (
    <g>
      <path d="M-10 236q80-24 150-2t170-8v140H-10z" fill={p.ground[0]} />
      <path d="M-10 270q90-30 170 0t150-6v100H-10z" fill={p.ground[1]} />
    </g>
  ),
  sea: (p) => (
    <g>
      <rect x="-10" y="232" width="320" height="140" fill={p.water[1]} />
      <path d="M-10 232q25-6 50 0t50 0 50 0 50 0 50 0 50 0 50 0v14h-350z" fill={p.water[0]} class="anim-wave" />
      <path d="M-30 270q25-6 50 0t50 0 50 0 50 0 50 0 50 0 50 0v10h-350z" fill={p.water[0]} opacity="0.4" class="anim-wave-slow" />
    </g>
  ),
  mountains: (p) => (
    <g>
      <path d="M-10 236l60-80 40 44 50-74 60 82 40-38 70 66v40H-10z" fill={p.far} />
      <path d="M-10 250l70-50 50 36 60-44 70 52 70-30v40H-10z" fill={p.mid} />
      <rect x="-10" y="250" width="320" height="120" fill={p.ground[1]} />
    </g>
  ),
  valley: (p) => (
    <g>
      <path d="M-10 120l90 110 30 20H-10z" fill={p.far} />
      <path d="M310 110l-90 120-30 20h120z" fill={p.far} />
      <path d="M-10 170l110 80H-10z" fill={p.mid} />
      <path d="M310 160l-110 90h110z" fill={p.mid} />
      <rect x="-10" y="250" width="320" height="120" fill={p.ground[0]} />
      <path d="M-10 290q160-30 320 0v80H-10z" fill={p.ground[1]} />
    </g>
  ),
  garden: (p) => (
    <g>
      <path d="M-10 236q70-26 150-6t170-6v140H-10z" fill={p.leaf} opacity="0.75" />
      <path d="M-10 266q90-28 170-4t150-6v110H-10z" fill={p.leaf} />
      {[40, 90, 200, 262].map((x, i) => (
        <circle key={i} cx={x} cy={238 - (i % 2) * 6} r={12 + (i % 3) * 3} fill={p.leaf} />
      ))}
    </g>
  ),
  city: (p) => (
    <g>
      {[
        [-4, 196, 46], [40, 210, 40], [78, 186, 36], [112, 204, 48], [158, 178, 34], [190, 200, 44], [232, 190, 40], [270, 206, 40],
      ].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={240 - y} fill={i % 2 ? p.far : p.mid} />
          <rect x={x + w / 2 - 4} y={y + 14} width="8" height="10" rx="4" fill={p.glow} opacity="0.35" />
        </g>
      ))}
      <rect x="-10" y="236" width="320" height="140" fill={p.ground[1]} />
    </g>
  ),
  river: (p) => (
    <g>
      <rect x="-10" y="232" width="320" height="140" fill={p.ground[0]} />
      <path d="M120 232q-60 40 20 70t-40 70h120q-60-40 0-70t-60-70z" fill={p.water[0]} class="anim-shimmer" />
      <path d="M-10 236q60-8 120-2" stroke={p.leaf} stroke-width="8" fill="none" />
    </g>
  ),
  plain: (p) => (
    <g>
      <rect x="-10" y="236" width="320" height="140" fill={p.ground[0]} />
      <path d="M-10 280q150-16 320 0v100H-10z" fill={p.ground[1]} />
    </g>
  ),
  cave: (p) => (
    <g>
      <path d="M-10 -10h320v380H-10zM60 300q0-180 90-200 90 20 90 200z" fill={p.ink} fill-rule="evenodd" />
      <path d="M60 300q0-180 90-200 90 20 90 200" fill="none" stroke={p.near} stroke-width="14" />
      <rect x="-10" y="300" width="320" height="70" fill={p.near} />
    </g>
  ),
};

// Back-to-front order of the elements drawn on the landscape.
const DEPTH: Motif[] = [
  'flood', 'sea-split', 'path', 'footprints', 'spring', 'rock', 'ruins', 'pillars', 'wall', 'cave-mouth', 'web', 'palace', 'tower',
  'house', 'tent', 'kaaba', 'tree', 'palms', 'palm', 'withered', 'gourd', 'wheat', 'well', 'rope', 'planks', 'ark', 'boat', 'big-fish',
  'camel', 'elephant', 'cows', 'sheep', 'wolf', 'serpent', 'dog', 'ants', 'hoopoe', 'throne', 'table', 'cradle', 'tablets', 'staff', 'book',
  'scroll', 'lamp', 'coins', 'gold', 'key', 'shirt', 'dates', 'basket', 'jar', 'bread', 'goblet', 'scales', 'fire', 'flames',
];

// Motifs that belong in front of the landscape; the rest are drawn in the sky.
const SKY_LAYER = new Set<Motif>(['sun', 'moon', 'crescent', 'stars', 'bright-star', 'clouds', 'dark-clouds', 'lightning', 'birds', 'light', 'wind', 'dove', 'locusts', 'raven']);
const WEATHER = new Set<Motif>(['rain', 'stones', 'prison']);

/** Dark shapes at the edges of the frame, drawn in front of everything: they give depth when the camera moves. */
const FOREGROUND: Record<Ground, (p: Palette) => JSX.Element | null> = {
  none: () => null,
  desert: (p) => (
    <g fill={p.ink} opacity="0.88">
      <path d="M-10 360v-34q40-14 80 4t30 30z" />
      <path d="M230 360q10-30 50-34t40 10v24z" />
      <Blades x={252} color={p.ink} />
    </g>
  ),
  sea: (p) => (
    <g fill={p.ink} opacity="0.9">
      <path d="M-10 360v-40q22-18 44-8t24 48z" />
      <path d="M262 360q-6-24 14-34t34 6v28z" />
    </g>
  ),
  mountains: (p) => (
    <g fill={p.ink} opacity="0.9">
      <path d="M-10 360v-50l24-16 30 8 18 58z" />
      <path d="M236 360l14-34 26-14 34 20v28z" />
    </g>
  ),
  valley: (p) => (
    <g fill={p.ink} opacity="0.88">
      <path d="M-10 360v-44l26-12 26 10 14 46z" />
      <path d="M240 360l10-30 28-10 32 18v22z" />
      <Blades x={38} color={p.ink} />
    </g>
  ),
  garden: (p) => (
    <g fill={p.ink} opacity="0.9">
      <Blades x={20} color={p.ink} tall />
      <Blades x={272} color={p.ink} tall />
      <path d="M-10 360v-22q40-12 80 4v18zM230 360v-18q40-14 80 0v18z" />
    </g>
  ),
  city: (p) => (
    <g fill={p.ink} opacity="0.88">
      <path d="M-10 360v-30h60v30zM250 360v-24h60v24z" />
    </g>
  ),
  river: (p) => (
    <g fill={p.ink} opacity="0.9">
      <Blades x={24} color={p.ink} tall />
      <Blades x={262} color={p.ink} tall />
      <path d="M-10 360v-18q50-8 100 4v14z" />
    </g>
  ),
  plain: (p) => (
    <g fill={p.ink} opacity="0.88">
      <Blades x={30} color={p.ink} />
      <Blades x={266} color={p.ink} />
      <path d="M-10 360v-16q60-10 120 2v14z" />
    </g>
  ),
  cave: (p) => (
    <g fill={p.ink} opacity="0.95">
      <path d="M-10 -10h60q-14 70-34 110-6-60-26-60z" />
      <path d="M250 -10h60v60q-20 10-30 60-14-50-30-120z" />
      <path d="M40 360l10-34 10 34zM236 360l12-40 12 40z" />
    </g>
  ),
};

/** A tuft of grass, drawn as a few swaying blades. */
function Blades({ x, color, tall = false }: { x: number; color: string; tall?: boolean }) {
  const h = tall ? 62 : 38;
  return (
    <g class="anim-sway" style={{ transformOrigin: `${x}px 360px` }} fill={color}>
      {[-14, -7, 0, 7, 14].map((d, i) => (
        <path key={i} d={`M${x + d - 2.5} 362q${d / 3} -${h * 0.55} ${d * 0.9 + (i % 2 ? 3 : -3)} -${h - (i % 3) * 8}q-2 ${h * 0.5} 6 ${h - (i % 3) * 8}z`} />
      ))}
    </g>
  );
}

/**
 * `layer` lets the stage move the sky, the land and the foreground at different
 * speeds (parallax); by default the whole picture is drawn at once.
 */
export function SceneArt({
  sky,
  ground,
  motifs = [],
  still = false,
  paused = false,
  label,
  layer = 'all',
}: {
  sky: Sky;
  ground: Ground;
  motifs?: Motif[];
  /** No animation at all (thumbnails). */
  still?: boolean;
  /** Animations stop where they are (the story is paused). */
  paused?: boolean;
  label?: string;
  layer?: 'all' | 'sky' | 'land' | 'fore';
}) {
  const p = PALETTES[sky];
  const id = `g${sky}`;
  const skyMotifs = motifs.filter((m) => SKY_LAYER.has(m));
  const groundMotifs = motifs
    .filter((m) => !SKY_LAYER.has(m) && !WEATHER.has(m))
    .sort((a, b) => DEPTH.indexOf(a) - DEPTH.indexOf(b));
  const weather = motifs.filter((m) => WEATHER.has(m));
  // Night skies always get a few stars, so a night scene never looks empty.
  const autoStars = sky === 'night' && !motifs.includes('stars');
  const all = layer === 'all';
  return (
    <svg
      viewBox="0 0 300 360"
      preserveAspectRatio="xMidYMid slice"
      class={`scene-art ${still ? 'still' : ''} ${paused ? 'paused' : ''}`}
      role="img"
      aria-label={label ?? 'Illustration'}
      aria-hidden={all ? undefined : 'true'}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={p.sky[0]} />
          <stop offset="0.55" stop-color={p.sky[1]} />
          <stop offset="1" stop-color={p.sky[2]} />
        </linearGradient>
      </defs>
      {(all || layer === 'sky') && (
        <>
          <rect x="-10" y="-10" width="320" height="380" fill={`url(#${id})`} />
          {autoStars && MOTIF_DRAW.stars(p, sky)}
          {skyMotifs.map((m) => (
            <g key={m} data-m={m}>
              {MOTIF_DRAW[m](p, sky)}
            </g>
          ))}
        </>
      )}
      {(all || layer === 'land') && (
        <>
          {GROUNDS[ground](p)}
          {groundMotifs.map((m) => (
            <g key={m} data-m={m}>
              {MOTIF_DRAW[m](p, sky)}
            </g>
          ))}
        </>
      )}
      {(all || layer === 'fore') && (
        <>
          {weather.map((m) => (
            <g key={m} data-m={m}>
              {MOTIF_DRAW[m](p, sky)}
            </g>
          ))}
          {layer === 'fore' && FOREGROUND[ground](p)}
        </>
      )}
      {all && (
        <>
          <rect x="-10" y="-10" width="320" height="380" fill="url(#vignette)" />
          <defs>
            <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
              <stop offset="0.6" stop-color="#000" stop-opacity="0" />
              <stop offset="1" stop-color="#000" stop-opacity="0.35" />
            </radialGradient>
          </defs>
        </>
      )}
    </svg>
  );
}
