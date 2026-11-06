import { describe, expect, it } from 'vitest';
import {
  PALETTE_PRESETS,
  contrastRatio,
  getPalettePreset,
  hexToRgb,
  isHexColor,
  normalizeHex,
  readableTextColor,
  relativeLuminance,
} from './palettes.js';

describe('isHexColor', () => {
  it.each(['#fff', '#FFFFFF', '#0e7490', '#AbC'])('accepts %s', (value) => {
    expect(isHexColor(value)).toBe(true);
  });

  it.each(['fff', '#ffff', '#gggggg', 'red', '', '#1234567'])('rejects %s', (value) => {
    expect(isHexColor(value)).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('expands shorthand and lower-cases', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#0E7490')).toBe('#0e7490');
  });

  it('throws on invalid input', () => {
    expect(() => normalizeHex('blue')).toThrow(/Invalid hex/);
  });
});

describe('hexToRgb', () => {
  it('converts to rgb tuples', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#0e7490')).toEqual([14, 116, 144]);
  });
});

describe('contrast helpers', () => {
  it('computes luminance at the extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1);
  });

  it('gives 21:1 for black on white regardless of order', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21);
  });

  it('gives 1:1 for identical colours', () => {
    expect(contrastRatio('#0e7490', '#0e7490')).toBeCloseTo(1);
  });

  it('picks readable text colours', () => {
    expect(readableTextColor('#ffffff')).toBe('#111827');
    expect(readableTextColor('#fef9c3')).toBe('#111827');
    expect(readableTextColor('#0f172a')).toBe('#ffffff');
    expect(readableTextColor('#0e7490')).toBe('#ffffff');
  });
});

describe('palette presets', () => {
  it('have unique ids', () => {
    const ids = PALETTE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('use only valid hex colours', () => {
    for (const preset of PALETTE_PRESETS) {
      for (const color of Object.values(preset.colors)) {
        expect(isHexColor(color), `${preset.id}: ${color}`).toBe(true);
      }
    }
  });

  it('keep body text readable (WCAG AA, 4.5:1)', () => {
    for (const { id, colors } of PALETTE_PRESETS) {
      expect(contrastRatio(colors.text, colors.background), id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('can be looked up by id', () => {
    expect(getPalettePreset('ocean')?.name).toBe('Ocean');
    expect(getPalettePreset('nope')).toBeUndefined();
  });
});
