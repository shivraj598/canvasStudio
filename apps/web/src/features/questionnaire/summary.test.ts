import { STEP_IDS } from '@canvas/shared';
import { completeAnswers, restaurantAnswers } from '@canvas/shared/testing';
import { describe, expect, it } from 'vitest';
import { summarizeStep } from './summary';

describe('summarizeStep', () => {
  it('returns nothing for unanswered steps', () => {
    for (const step of STEP_IDS) expect(summarizeStep(step, {})).toEqual([]);
  });

  it('describes every answered step in plain language', () => {
    expect(summarizeStep('brand', completeAnswers)).toEqual([
      { label: 'Name', value: 'Sunrise Dental' },
      { label: 'Tagline', value: 'Smiles that last' },
    ]);
    expect(summarizeStep('category', completeAnswers)).toEqual([
      { label: 'Category', value: 'Doctor / Clinic' },
    ]);
    expect(summarizeStep('goals', completeAnswers)[0]).toEqual({
      label: 'Goals',
      value: 'Get more bookings or appointments, Build trust and credibility',
    });
    expect(summarizeStep('pages', completeAnswers)).toEqual([
      { label: 'Pages', value: 'Home, About, Services, Contact' },
      { label: 'Features', value: 'Online booking / appointments' },
    ]);
    expect(summarizeStep('dashboard', completeAnswers)).toEqual([
      { label: 'Dashboard', value: 'Appointments, Messages & enquiries' },
    ]);
    expect(summarizeStep('design', completeAnswers)).toEqual([
      { label: 'Palette', value: 'Calm Clinic' },
      { label: 'Style', value: 'Modern' },
      { label: 'Fonts', value: 'Modern Sans' },
    ]);
  });

  it('handles "no dashboard", custom categories, custom palettes and empty contact', () => {
    expect(summarizeStep('dashboard', restaurantAnswers)).toEqual([
      { label: 'Dashboard', value: 'Not now' },
    ]);
    expect(
      summarizeStep('category', { category: { category: 'other', customCategory: 'Pet grooming' } }),
    ).toEqual([{ label: 'Category', value: 'Pet grooming' }]);
    expect(
      summarizeStep('design', {
        design: {
          paletteId: 'custom',
          customPalette: {
            primary: '#000000',
            secondary: '#000000',
            accent: '#000000',
            background: '#ffffff',
            text: '#000000',
          },
          style: 'bold',
          font: 'technical',
        },
      })[0],
    ).toEqual({ label: 'Palette', value: 'Custom colours' });
    expect(summarizeStep('contact', { contact: {} })).toEqual([
      { label: 'Contact', value: 'None provided' },
    ]);
  });
});
