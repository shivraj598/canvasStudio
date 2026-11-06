import { completeAnswers } from '@canvas/shared/testing';
import { describe, expect, it } from 'vitest';
import { initialStepValue, seedCustomPalette } from './defaults';

describe('initialStepValue', () => {
  it('returns a copy of the saved answer when present', () => {
    const value = initialStepValue('brand', completeAnswers);
    expect(value).toEqual(completeAnswers.brand);
    expect(value).not.toBe(completeAnswers.brand);
  });

  it('starts text fields empty', () => {
    expect(initialStepValue('brand', {})).toEqual({ brandName: '', tagline: '', logoUrl: '' });
  });

  it('pre-selects pages, features and widgets for the chosen category', () => {
    const draft = { category: { category: 'restaurant' as const } };
    expect(initialStepValue('pages', draft)).toEqual({
      pages: ['home', 'about', 'menu', 'gallery', 'testimonials', 'contact'],
      features: ['online-ordering', 'online-booking', 'map'],
    });
    expect(initialStepValue('dashboard', draft)).toEqual({
      wantsDashboard: true,
      widgets: ['orders', 'reservations', 'reviews'],
    });
  });

  it('falls back to generic pages without a category', () => {
    expect(initialStepValue('pages', {})).toEqual({
      pages: ['home', 'about', 'contact'],
      features: ['contact-form'],
    });
  });

  it('suggests a palette that suits the category', () => {
    expect(initialStepValue('design', { category: { category: 'doctor' } })).toMatchObject({
      paletteId: 'clinic',
    });
    expect(initialStepValue('design', {})).toMatchObject({ paletteId: 'ocean' });
  });
});

describe('seedCustomPalette', () => {
  it('copies the selected preset colours, defaulting to ocean', () => {
    expect(seedCustomPalette('mono').primary).toBe('#111827');
    expect(seedCustomPalette('custom').primary).toBe('#0e7490');
    expect(seedCustomPalette(undefined).primary).toBe('#0e7490');
  });
});
