// Reads a business's main colours from one photo (dark, main colour, light) — used only to colour the demo.
// Pure function over RGBA pixels; covered by palette.test.ts.

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function hsl(r: number, g: number, b: number) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { l, s };
}

export function luminance(h: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function shade(h: string, f: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return hex(r * f, g * f, b * f);
}

/** Groups pixels into colour buckets and picks a dark, a strong main colour, and a light background. */
export function paletteFromPixels(px: Uint8ClampedArray): { ink: string; accent: string; paper: string } {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++; bin.r += px[i]; bin.g += px[i + 1]; bin.b += px[i + 2];
    bins.set(key, bin);
  }
  const colours = [...bins.values()].map((b) => {
    const [r, g, bl] = [b.r / b.n, b.g / b.n, b.b / b.n];
    return { n: b.n, hex: hex(r, g, bl), ...hsl(r, g, bl) };
  });
  const total = colours.reduce((s, c) => s + c.n, 0) || 1;
  const pick = <T,>(arr: T[], score: (t: T) => number) => arr.reduce<T | null>((best, c) => (best === null || score(c) > score(best) ? c : best), null);

  const accentC = pick(colours.filter((c) => c.l > 0.2 && c.l < 0.7 && c.s > 0.25 && c.n / total > 0.01), (c) => c.s * Math.sqrt(c.n));
  const darkC = pick(colours.filter((c) => c.l < 0.22 && c.n / total > 0.01), (c) => c.n);
  let accent = accentC?.hex ?? '#9a5b3c';
  const ink = darkC ? shade(darkC.hex, darkC.l > 0.12 ? 0.6 : 1) : shade(accent, 0.25);
  const paper = '#fbf8f5';
  // The main colour is used for buttons with white text: make sure it is readable (WCAG AA for large text).
  for (let i = 0; i < 8 && contrast(accent, '#ffffff') < 3.2; i++) accent = shade(accent, 0.85);
  return { ink: contrast(ink, paper) < 7 ? shade(ink, 0.55) : ink, accent, paper };
}
