import { describe, expect, it } from 'vitest';
import {
  QUESTIONNAIRE_STEPS,
  STEP_IDS,
  getCompletedSteps,
  getNextIncompleteStep,
  getStep,
  isQuestionnaireComplete,
  isStepId,
  stripEmptyStrings,
  validateStep,
} from './questionnaire.js';
import { completeAnswers } from './testing/fixtures.js';

describe('step registry', () => {
  it('has unique ids in a fixed order', () => {
    expect(STEP_IDS).toEqual([
      'brand',
      'category',
      'about',
      'goals',
      'pages',
      'dashboard',
      'design',
      'contact',
    ]);
    expect(new Set(STEP_IDS).size).toBe(QUESTIONNAIRE_STEPS.length);
  });

  it('looks up steps by id', () => {
    expect(getStep('design').title).toBe('Look & feel');
    expect(isStepId('brand')).toBe(true);
    expect(isStepId('payment')).toBe(false);
  });
});

describe('stripEmptyStrings', () => {
  it('removes blank strings recursively but keeps other falsy values', () => {
    expect(
      stripEmptyStrings({ a: '', b: '  ', c: 'x', d: 0, e: false, f: { g: '' }, h: ['', 'y'] }),
    ).toEqual({ c: 'x', d: 0, e: false, f: {}, h: [undefined, 'y'] });
  });
});

describe('validateStep', () => {
  describe('brand', () => {
    it('accepts a name and treats empty optional fields as missing', () => {
      const result = validateStep('brand', { brandName: '  Café Luna ', tagline: '', logoUrl: '' });
      expect(result).toEqual({ success: true, data: { brandName: 'Café Luna' } });
    });

    it('rejects short names and bad logo urls with field errors', () => {
      const result = validateStep('brand', { brandName: 'A', logoUrl: 'not a url' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.fieldErrors.brandName).toMatch(/at least 2/);
        expect(result.fieldErrors.logoUrl).toMatch(/valid URL/);
      }
    });

    it.each(['javascript:alert(1)', 'data:text/html,hi', 'ftp://files.example.com/logo.png'])(
      'rejects non-http(s) logo url %s',
      (logoUrl) => {
        expect(validateStep('brand', { brandName: 'Safe', logoUrl }).success).toBe(false);
      },
    );

    it('accepts https logo urls', () => {
      expect(
        validateStep('brand', { brandName: 'Safe', logoUrl: 'https://cdn.example.com/logo.png' })
          .success,
      ).toBe(true);
    });
  });

  describe('category', () => {
    it('requires a custom description for "other"', () => {
      const result = validateStep('category', { category: 'other' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.fieldErrors.customCategory).toBeDefined();

      expect(
        validateStep('category', { category: 'other', customCategory: 'Pet grooming' }),
      ).toMatchObject({ success: true });
    });

    it('rejects unknown categories', () => {
      expect(validateStep('category', { category: 'spaceship' }).success).toBe(false);
    });
  });

  describe('about', () => {
    it('requires a meaningful description', () => {
      const result = validateStep('about', { description: 'We cook.' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.fieldErrors.description).toMatch(/20 characters/);
    });
  });

  describe('goals', () => {
    it('needs at least one goal', () => {
      expect(validateStep('goals', { goals: [] }).success).toBe(false);
      expect(validateStep('goals', { goals: ['sell-online'] }).success).toBe(true);
    });
  });

  describe('pages', () => {
    it('always includes home and de-duplicates', () => {
      const result = validateStep('pages', { pages: ['menu', 'contact', 'menu'] });
      expect(result).toEqual({
        success: true,
        data: { pages: ['home', 'menu', 'contact'], features: [] },
      });
    });
  });

  describe('dashboard', () => {
    it('requires widgets when a dashboard is wanted', () => {
      expect(validateStep('dashboard', { wantsDashboard: true, widgets: [] }).success).toBe(false);
    });

    it('drops widgets when no dashboard is wanted', () => {
      expect(validateStep('dashboard', { wantsDashboard: false, widgets: ['orders'] })).toEqual({
        success: true,
        data: { wantsDashboard: false, widgets: [] },
      });
    });
  });

  describe('design', () => {
    it('accepts a preset palette', () => {
      expect(
        validateStep('design', { paletteId: 'ocean', style: 'minimal', font: 'editorial' }).success,
      ).toBe(true);
    });

    it('requires valid colours for a custom palette', () => {
      const base = { paletteId: 'custom', style: 'bold', font: 'technical' };
      expect(validateStep('design', base).success).toBe(false);

      const bad = validateStep('design', {
        ...base,
        customPalette: {
          primary: 'red',
          secondary: '#000',
          accent: '#111',
          background: '#fff',
          text: '#000',
        },
      });
      expect(bad.success).toBe(false);
      if (!bad.success) expect(bad.fieldErrors['customPalette.primary']).toMatch(/hex/);

      const good = validateStep('design', {
        ...base,
        customPalette: {
          primary: '#ff0000',
          secondary: '#000',
          accent: '#111',
          background: '#fff',
          text: '#000',
        },
      });
      expect(good.success).toBe(true);
    });
  });

  describe('contact', () => {
    it('allows an empty contact step', () => {
      expect(validateStep('contact', { email: '', phone: '' })).toEqual({
        success: true,
        data: {},
      });
    });

    it('rejects javascript: social links', () => {
      expect(validateStep('contact', { facebook: 'javascript:alert(1)' }).success).toBe(false);
    });

    it('validates email and social urls', () => {
      const result = validateStep('contact', { email: 'nope', instagram: 'insta' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.keys(result.fieldErrors).sort()).toEqual(['email', 'instagram']);
      }
    });
  });
});

describe('friendly messages for missing answers', () => {
  it.each([
    ['brand', { brandName: '' }, 'brandName', 'Brand name is required'],
    ['category', {}, 'category', 'Choose a category'],
    ['about', { description: '   ' }, 'description', 'Tell us what you do'],
    ['goals', {}, 'goals', 'Pick at least one goal'],
    ['pages', {}, 'pages', 'Pick at least one page'],
    ['dashboard', {}, 'wantsDashboard', 'Choose yes or no'],
    ['design', {}, 'paletteId', 'Choose a colour palette'],
    ['design', {}, 'style', 'Choose a style'],
    ['design', {}, 'font', 'Choose a font pairing'],
  ] as const)('%s.%s', (step, data, field, message) => {
    const result = validateStep(step, data);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors[field]).toBe(message);
  });
});

describe('progress helpers', () => {
  it('reports nothing completed for an empty draft', () => {
    expect(getCompletedSteps({})).toEqual([]);
    expect(getNextIncompleteStep({})).toBe('brand');
    expect(isQuestionnaireComplete({})).toBe(false);
  });

  it('tracks partial progress in step order', () => {
    const draft = { brand: completeAnswers.brand, about: completeAnswers.about };
    expect(getCompletedSteps(draft)).toEqual(['brand', 'about']);
    expect(getNextIncompleteStep(draft)).toBe('category');
  });

  it('recognises a complete questionnaire', () => {
    expect(isQuestionnaireComplete(completeAnswers)).toBe(true);
    expect(getNextIncompleteStep(completeAnswers)).toBeNull();
  });
});
