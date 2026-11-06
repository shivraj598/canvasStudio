import {
  CATEGORY_INFO,
  FEATURE_LABELS,
  FONT_PAIRINGS,
  GOAL_LABELS,
  PAGE_LABELS,
  WIDGET_LABELS,
  getPalettePreset,
  type QuestionnaireDraft,
  type StepId,
} from '@canvas/shared';

export interface SummaryRow {
  label: string;
  value: string;
}

const list = (items: readonly string[]) => (items.length ? items.join(', ') : 'None');

/** Human-readable rows describing a saved step, for the review screen. */
export function summarizeStep(step: StepId, draft: QuestionnaireDraft): SummaryRow[] {
  const rows = (entries: [string, string | undefined][]): SummaryRow[] =>
    entries
      .filter((e): e is [string, string] => Boolean(e[1]))
      .map(([label, value]) => ({ label, value }));

  switch (step) {
    case 'brand': {
      const a = draft.brand;
      return a
        ? rows([
            ['Name', a.brandName],
            ['Tagline', a.tagline],
            ['Logo', a.logoUrl],
          ])
        : [];
    }
    case 'category': {
      const a = draft.category;
      if (!a) return [];
      const label =
        a.category === 'other' && a.customCategory
          ? a.customCategory
          : CATEGORY_INFO[a.category].label;
      return rows([['Category', label]]);
    }
    case 'about': {
      const a = draft.about;
      return a
        ? rows([
            ['Description', a.description],
            ['Customers', a.audience],
            ['What makes you different', a.uniqueValue],
            ['Location', a.location],
          ])
        : [];
    }
    case 'goals': {
      const a = draft.goals;
      return a
        ? rows([
            ['Goals', list(a.goals.map((g) => GOAL_LABELS[g]))],
            ['Expectations', a.expectations],
            ['Inspiration', a.inspiration],
          ])
        : [];
    }
    case 'pages': {
      const a = draft.pages;
      return a
        ? rows([
            ['Pages', list(a.pages.map((p) => PAGE_LABELS[p]))],
            ['Features', list(a.features.map((f) => FEATURE_LABELS[f]))],
          ])
        : [];
    }
    case 'dashboard': {
      const a = draft.dashboard;
      if (!a) return [];
      return rows([
        ['Dashboard', a.wantsDashboard ? list(a.widgets.map((w) => WIDGET_LABELS[w])) : 'Not now'],
      ]);
    }
    case 'design': {
      const a = draft.design;
      if (!a) return [];
      const palette =
        a.paletteId === 'custom'
          ? 'Custom colours'
          : (getPalettePreset(a.paletteId)?.name ?? a.paletteId);
      return rows([
        ['Palette', palette],
        ['Style', a.style[0]!.toUpperCase() + a.style.slice(1)],
        ['Fonts', FONT_PAIRINGS[a.font].label],
      ]);
    }
    case 'contact': {
      const a = draft.contact;
      if (!a) return [];
      const result = rows([
        ['Email', a.email],
        ['Phone', a.phone],
        ['Address', a.address],
        ['Instagram', a.instagram],
        ['Facebook', a.facebook],
        ['LinkedIn', a.linkedin],
      ]);
      return result.length ? result : [{ label: 'Contact', value: 'None provided' }];
    }
  }
}
