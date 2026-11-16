import { describe, expect, it } from 'vitest';
import { contrast, paletteFromPixels } from './palette';

const pixels = (parts: [number, number, number, number][]) => {
  const out: number[] = [];
  for (const [r, g, b, n] of parts) for (let i = 0; i < n; i++) out.push(r, g, b, 255);
  return new Uint8ClampedArray(out);
};

describe('colours from one photo', () => {
  it('finds black chairs, walnut floor and white walls (like Nidhi)', () => {
    const p = paletteFromPixels(pixels([[20, 18, 17, 400], [139, 74, 43, 300], [245, 243, 240, 500]]));
    expect(contrast(p.ink, p.paper)).toBeGreaterThan(7);
    expect(parseInt(p.accent.slice(1, 3), 16)).toBeGreaterThan(parseInt(p.accent.slice(5, 7), 16)); // warm (more red than blue)
    expect(contrast(p.accent, '#ffffff')).toBeGreaterThanOrEqual(3.2);
  });
  it('picks a pink salon brand colour and keeps white button text readable', () => {
    const p = paletteFromPixels(pixels([[240, 150, 180, 500], [250, 250, 250, 500], [40, 30, 35, 100]]));
    expect(contrast(p.accent, '#ffffff')).toBeGreaterThanOrEqual(3.2);
    expect(parseInt(p.accent.slice(1, 3), 16)).toBeGreaterThan(parseInt(p.accent.slice(3, 5), 16));
  });
  it('still gives safe colours for a grey photo', () => {
    const p = paletteFromPixels(pixels([[128, 128, 128, 1000]]));
    expect(p.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrast(p.ink, p.paper)).toBeGreaterThan(7);
  });
});
