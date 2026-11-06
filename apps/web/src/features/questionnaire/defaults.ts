import {
  CATEGORY_INFO,
  getPalettePreset,
  type BusinessCategory,
  type QuestionnaireDraft,
  type StepId,
} from '@canvas/shared';
import type { StepFormValue, StepFormValues } from './types';

const PALETTE_FOR_CATEGORY: Partial<Record<BusinessCategory, string>> = {
  doctor: 'clinic',
  teacher: 'classroom',
  restaurant: 'espresso',
  hotel: 'luxury',
  salon: 'sunset',
  consultant: 'mono',
  retail: 'ocean',
  nonprofit: 'forest',
};

/**
 * The starting value for a step's form: the saved answer if there is one, otherwise sensible
 * defaults based on the business category chosen earlier.
 */
export function initialStepValue<S extends StepId>(
  step: S,
  draft: QuestionnaireDraft,
): StepFormValue<S> {
  const saved = draft[step];
  if (saved) return structuredClone(saved) as StepFormValue<S>;

  const category = draft.category?.category;
  const info = category ? CATEGORY_INFO[category] : undefined;

  const defaults: StepFormValues = {
    brand: { brandName: '', tagline: '', logoUrl: '' },
    category: {},
    about: { description: '', audience: '', uniqueValue: '', location: '' },
    goals: { goals: [], expectations: '', inspiration: '' },
    pages: {
      pages: info ? [...info.defaultPages] : ['home', 'about', 'contact'],
      features: info ? [...info.defaultFeatures] : ['contact-form'],
    },
    dashboard: { wantsDashboard: true, widgets: info ? [...info.defaultWidgets] : [] },
    design: {
      paletteId: (category && PALETTE_FOR_CATEGORY[category]) ?? 'ocean',
      style: 'modern',
      font: 'modern-sans',
    } as StepFormValues['design'],
    contact: { email: '', phone: '', address: '', instagram: '', facebook: '', linkedin: '' },
  };
  return defaults[step] as StepFormValue<S>;
}

/** Colours to seed the custom palette editor with, based on the currently selected preset. */
export function seedCustomPalette(paletteId: string | undefined) {
  return { ...(getPalettePreset(paletteId ?? '') ?? getPalettePreset('ocean')!).colors };
}
