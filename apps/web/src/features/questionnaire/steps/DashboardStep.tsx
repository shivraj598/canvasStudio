import { DASHBOARD_WIDGETS, WIDGET_LABELS } from '@canvas/shared';
import { CheckboxCards, RadioCards } from '../../../components/Choice';
import type { StepProps } from '../types';

const WIDGET_OPTIONS = DASHBOARD_WIDGETS.map((id) => ({ value: id, label: WIDGET_LABELS[id] }));

export function DashboardStep({ value, onChange, errors }: StepProps<'dashboard'>) {
  const wants = value.wantsDashboard;
  return (
    <div className="space-y-8">
      <RadioCards
        name="wantsDashboard"
        legend="Would you like a private dashboard to manage your website?"
        options={[
          {
            value: 'yes',
            label: 'Yes, give me a dashboard',
            description: 'See bookings, orders, messages and stats in one place.',
          },
          { value: 'no', label: 'Not right now', description: 'You can add one later.' },
        ]}
        value={wants === undefined ? undefined : wants ? 'yes' : 'no'}
        onChange={(choice) => onChange({ ...value, wantsDashboard: choice === 'yes' })}
        error={errors.wantsDashboard}
        columns={2}
      />
      {wants && (
        <CheckboxCards
          legend="What should your dashboard show?"
          options={WIDGET_OPTIONS}
          value={value.widgets ?? []}
          onChange={(widgets) => onChange({ ...value, widgets })}
          error={errors.widgets}
        />
      )}
    </div>
  );
}
