/**
 * The onboarding questionnaire. Each step has its own Zod schema so the web app can validate
 * one screen at a time and the API can save partial drafts; the full answer set is validated
 * again before a site is generated.
 */
import { z } from 'zod';
import {
  BUSINESS_CATEGORIES,
  DASHBOARD_WIDGETS,
  SITE_FEATURES,
  SITE_PAGES,
  WEBSITE_GOALS,
} from './categories.js';
import { HEX_COLOR_PATTERN, PALETTE_PRESET_IDS } from './palettes.js';

export const DESIGN_STYLES = [
  'modern',
  'classic',
  'minimal',
  'playful',
  'elegant',
  'bold',
] as const;
export type DesignStyle = (typeof DESIGN_STYLES)[number];

export const FONT_PAIRINGS = {
  'modern-sans': { label: 'Modern Sans', heading: 'Inter', body: 'Inter' },
  'classic-serif': { label: 'Classic Serif', heading: 'Playfair Display', body: 'Source Sans 3' },
  friendly: { label: 'Friendly Rounded', heading: 'Nunito', body: 'Nunito' },
  editorial: { label: 'Editorial', heading: 'DM Serif Display', body: 'DM Sans' },
  technical: { label: 'Technical', heading: 'IBM Plex Sans', body: 'IBM Plex Sans' },
} as const;
export type FontPairing = keyof typeof FONT_PAIRINGS;
export const FONT_PAIRING_IDS = Object.keys(FONT_PAIRINGS) as [FontPairing, ...FontPairing[]];

const optionalText = (max: number) => z.string().trim().max(max).optional();
const hexColor = z.string().regex(HEX_COLOR_PATTERN, 'Must be a hex colour like #1a2b3c');
/** Only http(s) links — these end up in generated HTML, so `javascript:` etc. must be rejected. */
const webUrl = (message = 'Must be a valid http(s) URL') =>
  z.url({ protocol: /^https?$/, message });

export const brandStepSchema = z.object({
  brandName: z
    .string({ error: 'Brand name is required' })
    .trim()
    .min(2, 'Brand name must be at least 2 characters')
    .max(80),
  tagline: optionalText(140),
  logoUrl: webUrl('Logo must be a valid URL').optional(),
});

export const categoryStepSchema = z
  .object({
    category: z.enum(BUSINESS_CATEGORIES, { error: 'Choose a category' }),
    customCategory: optionalText(80),
  })
  .refine((v) => v.category !== 'other' || (v.customCategory?.length ?? 0) >= 2, {
    message: 'Please describe your category',
    path: ['customCategory'],
  });

export const aboutStepSchema = z.object({
  description: z
    .string({ error: 'Tell us what you do' })
    .trim()
    .min(20, 'Tell us a little more — at least 20 characters')
    .max(1000),
  audience: optionalText(300),
  uniqueValue: optionalText(300),
  location: optionalText(120),
});

export const goalsStepSchema = z.object({
  goals: z
    .array(z.enum(WEBSITE_GOALS), { error: 'Pick at least one goal' })
    .min(1, 'Pick at least one goal'),
  expectations: optionalText(1000),
  inspiration: optionalText(500),
});

export const pagesStepSchema = z.object({
  pages: z
    .array(z.enum(SITE_PAGES), { error: 'Pick at least one page' })
    .min(1, 'Pick at least one page')
    .transform((pages) => (pages.includes('home') ? pages : ['home' as const, ...pages]))
    .transform((pages) => [...new Set(pages)]),
  features: z.array(z.enum(SITE_FEATURES)).default([]),
});

export const dashboardStepSchema = z
  .object({
    wantsDashboard: z.boolean({ error: 'Choose yes or no' }),
    widgets: z.array(z.enum(DASHBOARD_WIDGETS)).default([]),
  })
  .refine((v) => !v.wantsDashboard || v.widgets.length > 0, {
    message: 'Pick at least one dashboard widget',
    path: ['widgets'],
  })
  .transform((v) => (v.wantsDashboard ? v : { ...v, widgets: [] }));

export const colorPaletteSchema = z.object({
  primary: hexColor,
  secondary: hexColor,
  accent: hexColor,
  background: hexColor,
  text: hexColor,
});

export const designStepSchema = z
  .object({
    paletteId: z.enum([...PALETTE_PRESET_IDS, 'custom'], { error: 'Choose a colour palette' }),
    customPalette: colorPaletteSchema.optional(),
    style: z.enum(DESIGN_STYLES, { error: 'Choose a style' }),
    font: z.enum(FONT_PAIRING_IDS, { error: 'Choose a font pairing' }),
  })
  .refine((v) => v.paletteId !== 'custom' || v.customPalette !== undefined, {
    message: 'Choose your custom colours',
    path: ['customPalette'],
  });

export const contactStepSchema = z.object({
  email: z.email('Enter a valid email').optional(),
  phone: optionalText(40),
  address: optionalText(200),
  instagram: webUrl().optional(),
  facebook: webUrl().optional(),
  linkedin: webUrl().optional(),
});

export const QUESTIONNAIRE_STEPS = [
  {
    id: 'brand',
    title: 'Your brand',
    description: 'What is your business or practice called?',
    schema: brandStepSchema,
  },
  {
    id: 'category',
    title: 'What kind of business?',
    description: 'This helps us pick the right pages and layout.',
    schema: categoryStepSchema,
  },
  {
    id: 'about',
    title: 'What do you do?',
    description: 'Describe your work in your own words — we will polish it.',
    schema: aboutStepSchema,
  },
  {
    id: 'goals',
    title: 'Your goals',
    description: 'What should your website achieve for you?',
    schema: goalsStepSchema,
  },
  {
    id: 'pages',
    title: 'Pages & features',
    description: 'Choose what your visitors can see and do.',
    schema: pagesStepSchema,
  },
  {
    id: 'dashboard',
    title: 'Your dashboard',
    description: 'A private area to manage bookings, orders, messages and more.',
    schema: dashboardStepSchema,
  },
  {
    id: 'design',
    title: 'Look & feel',
    description: 'Pick colours, a style and fonts.',
    schema: designStepSchema,
  },
  {
    id: 'contact',
    title: 'Contact details',
    description: 'How can visitors reach you? Everything here is optional.',
    schema: contactStepSchema,
  },
] as const;

export type QuestionnaireStep = (typeof QUESTIONNAIRE_STEPS)[number];
export type StepId = QuestionnaireStep['id'];
export const STEP_IDS = QUESTIONNAIRE_STEPS.map((s) => s.id) as [StepId, ...StepId[]];

export const questionnaireAnswersSchema = z.object({
  brand: brandStepSchema,
  category: categoryStepSchema,
  about: aboutStepSchema,
  goals: goalsStepSchema,
  pages: pagesStepSchema,
  dashboard: dashboardStepSchema,
  design: designStepSchema,
  contact: contactStepSchema,
});

export type QuestionnaireAnswers = z.output<typeof questionnaireAnswersSchema>;
/** Answers saved so far — any step may still be missing. */
export type QuestionnaireDraft = Partial<QuestionnaireAnswers>;
export type StepAnswers<S extends StepId> = QuestionnaireAnswers[S];
export type StepInput<S extends StepId> = z.input<(typeof questionnaireAnswersSchema)['shape'][S]>;

export type BrandStep = StepAnswers<'brand'>;
export type CategoryStep = StepAnswers<'category'>;
export type AboutStep = StepAnswers<'about'>;
export type GoalsStep = StepAnswers<'goals'>;
export type PagesStep = StepAnswers<'pages'>;
export type DashboardStep = StepAnswers<'dashboard'>;
export type DesignStep = StepAnswers<'design'>;
export type ContactStep = StepAnswers<'contact'>;

export function isStepId(value: string): value is StepId {
  return (STEP_IDS as string[]).includes(value);
}

export function getStep(id: StepId): QuestionnaireStep {
  const step = QUESTIONNAIRE_STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`Unknown questionnaire step: ${id}`);
  return step;
}

/**
 * Form inputs submit `''` for untouched optional fields. Convert those to `undefined`
 * (recursively) so optional validators such as `z.url().optional()` accept them.
 */
export function stripEmptyStrings<T>(value: T): T {
  if (typeof value === 'string') {
    return (value.trim() === '' ? undefined : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(stripEmptyStrings) as T;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([k, v]) => [k, stripEmptyStrings(v)] as const)
      .filter(([, v]) => v !== undefined);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export type StepValidationResult<S extends StepId> =
  { success: true; data: StepAnswers<S> } | { success: false; fieldErrors: Record<string, string> };

/** Validates one step's raw form data. Field errors are keyed by dotted path. */
export function validateStep<S extends StepId>(id: S, raw: unknown): StepValidationResult<S> {
  const schema = questionnaireAnswersSchema.shape[id];
  const result = schema.safeParse(stripEmptyStrings(raw));
  if (result.success) {
    return { success: true, data: result.data as StepAnswers<S> };
  }
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fieldErrors[key] ??= issue.message;
  }
  return { success: false, fieldErrors };
}

export function getCompletedSteps(draft: QuestionnaireDraft): StepId[] {
  return STEP_IDS.filter((id) => draft[id] !== undefined && validateStep(id, draft[id]).success);
}

export function isQuestionnaireComplete(draft: QuestionnaireDraft): draft is QuestionnaireAnswers {
  return getCompletedSteps(draft).length === STEP_IDS.length;
}

/** The first step the user still has to fill in, or `null` when everything is done. */
export function getNextIncompleteStep(draft: QuestionnaireDraft): StepId | null {
  const done = new Set(getCompletedSteps(draft));
  return STEP_IDS.find((id) => !done.has(id)) ?? null;
}
