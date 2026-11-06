import { FEATURE_LABELS, PAGE_LABELS, SITE_FEATURES, SITE_PAGES } from '@canvas/shared';
import { CheckboxCards } from '../../../components/Choice';
import type { StepProps } from '../types';

const PAGE_OPTIONS = SITE_PAGES.map((id) => ({
  value: id,
  label: PAGE_LABELS[id],
  // Every site has a home page.
  disabled: id === 'home',
}));
const FEATURE_OPTIONS = SITE_FEATURES.map((id) => ({ value: id, label: FEATURE_LABELS[id] }));

export function PagesStep({ value, onChange, errors, draft }: StepProps<'pages'>) {
  const pages = value.pages ?? ['home'];
  const categoryLabel = draft.category
    ? 'We pre-selected pages that suit your business.'
    : undefined;
  return (
    <div className="space-y-8">
      <CheckboxCards
        legend="Pages"
        hint={categoryLabel}
        options={PAGE_OPTIONS}
        value={pages.includes('home') ? pages : ['home', ...pages]}
        onChange={(next) => onChange({ ...value, pages: next })}
        error={errors.pages}
        columns={4}
      />
      <CheckboxCards
        legend="Features"
        options={FEATURE_OPTIONS}
        value={value.features ?? []}
        onChange={(features) => onChange({ ...value, features })}
        error={errors.features}
      />
    </div>
  );
}
