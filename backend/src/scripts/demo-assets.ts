// Illustrations et PDF d'EXEMPLE fabriqués à la volée pour le contenu de démonstration (aucun fichier externe, aucun droit d'auteur).
// Les illustrations sont volontairement sans texte : elles sont remplacées par les vraies photos depuis l'administration.

/** Générateur pseudo-aléatoire reproductible (mêmes images à chaque exécution). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Palette = { top: string; mid: string; low: string; sun: string; ink: string; sea: string; sand: string };
const PALETTES: Record<string, Palette> = {
  dawn: { top: '#1F3A5F', mid: '#B9785A', low: '#F3D9A4', sun: '#FFF1C9', ink: '#10213A', sea: '#2C5282', sand: '#E6CF9C' },
  day: { top: '#3F7CB8', mid: '#8DBBDD', low: '#E6F0F2', sun: '#FFF8DC', ink: '#17324F', sea: '#2F7FA8', sand: '#EBD9A8' },
  dusk: { top: '#2A2350', mid: '#A2496A', low: '#F2A65A', sun: '#FFE2A8', ink: '#150F2B', sea: '#4A3F7A', sand: '#C99A6B' },
  night: { top: '#070D1C', mid: '#12233F', low: '#24456E', sun: '#F4EBC8', ink: '#050912', sea: '#16304F', sand: '#1C2B45' },
};
export type SceneKind = 'church' | 'beach' | 'procession' | 'feast' | 'window' | 'assembly';

const W = 1600;
const H = 1067;

const sky = (p: Palette, sunX: number, sunY: number, sunR: number) => `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset="0.62" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.low}"/></linearGradient>
    <radialGradient id="glow" cx="${sunX}" cy="${sunY}" r="${sunR * 6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.sun}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${p.sun}"/>`;

const church = (cx: number, base: number, s: number, fill: string, light: string) => `
  <g transform="translate(${cx} ${base}) scale(${s})">
    <g fill="${fill}">
      <rect x="-240" y="-330" width="480" height="330"/>
      <polygon points="-262,-330 0,-470 262,-330"/>
      <rect x="-30" y="-640" width="60" height="180"/>
      <polygon points="-42,-640 0,-720 42,-640"/>
      <rect x="-6" y="-790" width="12" height="78"/>
      <rect x="-28" y="-766" width="56" height="12"/>
      <rect x="-470" y="-230" width="230" height="230"/>
      <rect x="240" y="-230" width="230" height="230"/>
    </g>
    <g fill="${light}">
      <path d="M-34,0 V-110 a34,34 0 0 1 68,0 V0 Z"/>
      <path d="M-170,-150 v-70 a20,20 0 0 1 40,0 v70 Z"/>
      <path d="M130,-150 v-70 a20,20 0 0 1 40,0 v70 Z"/>
      <circle cx="0" cy="-270" r="26"/>
      <path d="M-380,-70 v-60 a16,16 0 0 1 32,0 v60 Z"/>
      <path d="M348,-70 v-60 a16,16 0 0 1 32,0 v60 Z"/>
    </g>
  </g>`;

function palm(x: number, base: number, h: number, lean: number, fill: string) {
  const tx = x + lean;
  const ty = base - h;
  let fronds = '';
  for (const [dx, dy, drop] of [[-150, -30, 70], [-110, -90, 30], [-30, -120, 10], [60, -110, 20], [140, -60, 60], [165, 10, 90], [-170, 30, 100]] as const) {
    const k = h / 420;
    fronds += `<path d="M${tx},${ty} Q${tx + (dx * k) / 2},${ty + dy * k - 20 * k} ${tx + dx * k},${ty + (dy + drop) * k}" stroke="${fill}" stroke-width="${22 * k}" stroke-linecap="round" fill="none"/>`;
  }
  return `<path d="M${x - 12},${base} Q${x + lean * 0.3},${base - h * 0.5} ${tx - 7},${ty} L${tx + 7},${ty} Q${x + lean * 0.3 + 26},${base - h * 0.5} ${x + 14},${base} Z" fill="${fill}"/>${fronds}`;
}

function crowd(base: number, rows: number, fill: string, r: () => number, accents: string[] = []) {
  let out = '';
  for (let row = 0; row < rows; row++) {
    const y = base - (rows - 1 - row) * 62;
    const size = 34 + row * 9;
    for (let x = -40 + r() * 40; x < W + 60; x += size * (1.9 + r() * 0.5)) {
      const c = accents.length && r() < 0.28 ? accents[Math.floor(r() * accents.length)]! : fill;
      const jitter = (r() - 0.5) * 18;
      out += `<circle cx="${x.toFixed(0)}" cy="${(y - size * 1.5 + jitter).toFixed(0)}" r="${(size * 0.55).toFixed(0)}" fill="${fill}"/>`;
      out += `<path d="M${(x - size).toFixed(0)},${H} V${(y + jitter).toFixed(0)} a${size},${size * 0.95} 0 0 1 ${size * 2},0 V${H} Z" fill="${c}"/>`;
    }
  }
  return out;
}

function bunting(y: number, sag: number, colors: string[], r: () => number) {
  let out = `<path d="M-20,${y} Q${W / 2},${y + sag * 2} ${W + 20},${y}" stroke="#F8F3E3" stroke-width="4" fill="none" opacity="0.9"/>`;
  const n = 22;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = t * W;
    const py = y + 2 * sag * 2 * t * (1 - t);
    out += `<polygon points="${x - 26},${py} ${x + 26},${py} ${x + (r() - 0.5) * 8},${py + 66}" fill="${colors[i % colors.length]}"/>`;
  }
  return out;
}

function seaBand(y: number, p: Palette) {
  let waves = '';
  for (let i = 0; i < 6; i++) {
    const yy = y + 26 + i * 34;
    waves += `<path d="M0,${yy} q100,-16 200,0 t200,0 t200,0 t200,0 t200,0 t200,0 t200,0 t200,0" stroke="#FFFFFF" stroke-opacity="${0.32 - i * 0.04}" stroke-width="5" fill="none" transform="translate(${-i * 37} 0)"/>`;
  }
  return `<rect y="${y}" width="${W}" height="${H - y}" fill="${p.sea}"/>${waves}`;
}

function stainedGlass(r: () => number) {
  const colors = ['#1F3A5F', '#2C5282', '#B8860B', '#E9D8A6', '#8E2F3C', '#2E7D5B', '#D9A441', '#5B4B9A', '#F3EBD3'];
  const x0 = 430;
  const x1 = 1170;
  const y1 = 1010;
  const cols = 7;
  const rows = 9;
  const cw = (x1 - x0) / cols;
  const ch = 780 / rows;
  const pts: [number, number][][] = [];
  for (let j = 0; j <= rows; j++) {
    pts.push([]);
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || i === cols || j === 0 || j === rows;
      pts[j]!.push([x0 + i * cw + (edge ? 0 : (r() - 0.5) * cw * 0.5), y1 - 780 + j * ch + (edge ? 0 : (r() - 0.5) * ch * 0.5)]);
    }
  }
  let panes = '';
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [a, b, c, d] = [pts[j]![i]!, pts[j]![i + 1]!, pts[j + 1]![i + 1]!, pts[j + 1]![i]!];
      const col = () => colors[Math.floor(r() * colors.length)];
      panes += `<polygon points="${a} ${b} ${d}" fill="${col()}"/><polygon points="${b} ${c} ${d}" fill="${col()}"/>`;
    }
  }
  const arch = `M${x0},${y1} V420 A${(x1 - x0) / 2},${(x1 - x0) / 2} 0 0 1 ${x1},420 V${y1} Z`;
  return `
  <defs>
    <clipPath id="arch"><path d="${arch}"/></clipPath>
    <radialGradient id="halo" cx="800" cy="520" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F6E7B4" stop-opacity="0.5"/><stop offset="1" stop-color="#0B1524" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0B1524"/>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>
  <g clip-path="url(#arch)" stroke="#0B1524" stroke-width="7" stroke-linejoin="round">
    <rect x="${x0}" y="0" width="${x1 - x0}" height="${H}" fill="#F3EBD3"/>${panes}
    <g fill="#F6E7B4" stroke="#0B1524"><rect x="772" y="330" width="56" height="460"/><rect x="640" y="470" width="320" height="56"/></g>
  </g>
  <path d="${arch}" fill="none" stroke="#B8860B" stroke-width="16"/>
  <rect y="${y1}" width="${W}" height="${H - y1}" fill="#060B14"/>`;
}

/** Illustration SVG (1600 × 1067) d'une scène de la vie paroissiale. */
export function sceneSvg(kind: SceneKind, palette: keyof typeof PALETTES, seed: number): string {
  const p = PALETTES[palette]!;
  const r = rng(seed);
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  const sunX = 250 + r() * 1100;
  const sunY = palette === 'day' ? 170 + r() * 80 : 420 + r() * 140;
  const accents = ['#B8860B', '#E9D8A6', '#8E2F3C', '#2E7D5B', '#F3EBD3', '#2C5282'];
  let body = '';

  if (kind === 'window') return `${open}${stainedGlass(r)}</svg>`;

  body += sky(p, sunX, sunY, palette === 'night' ? 46 : 78);
  if (palette === 'night') {
    for (let i = 0; i < 90; i++) body += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 560).toFixed(0)}" r="${(1 + r() * 2.4).toFixed(1)}" fill="#FFFFFF" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
  }

  if (kind === 'church') {
    body += `<path d="M0,820 Q400,720 800,790 T1600,760 V${H} H0 Z" fill="${p.ink}" opacity="0.45"/>`;
    body += palm(210, 930, 420, 50, p.ink) + palm(1410, 940, 360, -40, p.ink);
    body += church(800, 930, 0.92, p.ink, p.low);
    body += `<rect y="930" width="${W}" height="${H - 930}" fill="${p.ink}"/>`;
  } else if (kind === 'beach') {
    body += seaBand(600, p);
    body += `<path d="M0,860 Q500,770 1000,850 T1600,820 V${H} H0 Z" fill="${p.sand}"/>`;
    body += palm(240 + r() * 80, 900, 560, 90, p.ink) + palm(430, 930, 400, 40, p.ink) + palm(1340 + r() * 60, 910, 500, -80, p.ink);
    body += `<path d="M700,560 l70,-90 l10,90 Z M790,560 h-110 q55,34 110,0 Z" fill="${p.ink}" opacity="0.8"/>`;
  } else if (kind === 'procession') {
    body += church(1180, 800, 0.62, p.ink, '#F0C56B');
    body += `<rect y="800" width="${W}" height="${H - 800}" fill="${p.ink}"/>`;
    body += crowd(1010, 3, '#0B1524', r);
    for (let i = 0; i < 42; i++) {
      const x = r() * W;
      const y = 800 + r() * 190;
      body += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(26 + r() * 20).toFixed(0)}" fill="#F6C453" opacity="0.16"/><ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="5" ry="10" fill="#FFE9A8"/>`;
    }
  } else if (kind === 'feast') {
    body += church(320, 880, 0.55, p.ink, p.low) + palm(1330, 900, 430, -60, p.ink);
    body += `<rect y="880" width="${W}" height="${H - 880}" fill="${p.ink}"/>`;
    body += bunting(120, 70, accents, r) + bunting(250, 50, [...accents].reverse(), r);
    body += crowd(1030, 3, p.ink, r, accents);
  } else {
    // Assemblée : fidèles tournés vers l'autel et la croix
    body += `<rect y="0" width="${W}" height="${H}" fill="${p.ink}" opacity="0.35"/>`;
    body += `<path d="M560,${H} V330 A240,240 0 0 1 1040,330 V${H} Z" fill="${p.low}" opacity="0.9"/>`;
    body += `<rect x="786" y="250" width="28" height="330" fill="#B8860B"/><rect x="690" y="340" width="220" height="28" fill="#B8860B"/>`;
    body += `<rect x="620" y="700" width="360" height="120" rx="6" fill="#F8F3E3"/><rect x="600" y="690" width="400" height="22" fill="#B8860B"/>`;
    body += `<ellipse cx="660" cy="660" rx="6" ry="14" fill="#FFE9A8"/><rect x="656" y="672" width="8" height="24" fill="#F8F3E3"/><ellipse cx="940" cy="660" rx="6" ry="14" fill="#FFE9A8"/><rect x="936" y="672" width="8" height="24" fill="#F8F3E3"/>`;
    body += crowd(1040, 4, p.ink, r, accents);
  }
  return `${open}${body}</svg>`;
}

// ---------- PDF minimal (une page A4, polices standard) ----------

const pdfSafe = (s: string) =>
  s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/…/g, '...').replace(/[^\x20-\xFF]/g, '?').replace(/[\\()]/g, '\\$&');

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max) {
      out.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  return out;
}

/** PDF d'une page. Lignes commençant par « # » = intertitre ; ligne vide = espace. */
export function simplePdf(title: string, subtitle: string, lines: string[]): Buffer {
  const ops: string[] = [];
  let y = 770;
  ops.push(`0.122 0.227 0.373 rg BT /F2 24 Tf 1 0 0 1 56 ${y} Tm (${pdfSafe(title)}) Tj ET`);
  y -= 24;
  ops.push(`0.525 0.38 0.04 rg BT /F1 12 Tf 1 0 0 1 56 ${y} Tm (${pdfSafe(subtitle)}) Tj ET`);
  y -= 14;
  ops.push(`0.72 0.525 0.043 RG 1.5 w 56 ${y} m 539 ${y} l S`);
  y -= 30;
  for (const raw of lines) {
    if (!raw.trim()) {
      y -= 10;
      continue;
    }
    if (raw.startsWith('# ')) {
      y -= 8;
      ops.push(`0.122 0.227 0.373 rg BT /F2 15 Tf 1 0 0 1 56 ${y} Tm (${pdfSafe(raw.slice(2))}) Tj ET`);
      y -= 22;
      continue;
    }
    for (const l of wrap(raw, 92)) {
      ops.push(`0.15 0.18 0.23 rg BT /F1 11 Tf 1 0 0 1 56 ${y} Tm (${pdfSafe(l)}) Tj ET`);
      y -= 16;
    }
    y -= 4;
  }
  ops.push(`0.4 0.45 0.5 rg BT /F1 9 Tf 1 0 0 1 56 40 Tm (${pdfSafe('Paroisse Sainte Lucie de Baguida - document d\'exemple')}) Tj ET`);

  const stream = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
