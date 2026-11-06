import type { QuestionnaireDraft, StepId } from '@canvas/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { initialStepValue } from '../defaults';
import type { StepFormValue } from '../types';
import { StepFields } from './index';

/** Renders a step as a controlled form and exposes its latest value. */
function renderStep<S extends StepId>(
  step: S,
  { draft = {}, errors = {} }: { draft?: QuestionnaireDraft; errors?: Record<string, string> } = {},
) {
  const latest: { value: StepFormValue<S> } = { value: initialStepValue(step, draft) };
  function Harness() {
    const [value, setValue] = useState(latest.value);
    return (
      <StepFields
        step={step}
        value={value}
        onChange={(next) => {
          latest.value = next;
          setValue(next);
        }}
        errors={errors}
        draft={draft}
      />
    );
  }
  render(<Harness />);
  return latest;
}

describe('BrandStep', () => {
  it('edits brand fields', async () => {
    const latest = renderStep('brand');
    await userEvent.type(screen.getByLabelText('Brand or business name'), 'Café Luna');
    await userEvent.type(screen.getByLabelText(/Tagline/), 'Coffee & calm');
    expect(latest.value).toMatchObject({ brandName: 'Café Luna', tagline: 'Coffee & calm' });
  });

  it('previews http(s) logos only', async () => {
    renderStep('brand');
    await userEvent.type(screen.getByLabelText(/Logo URL/), 'javascript:alert(1)');
    expect(screen.queryByAltText('Logo preview')).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/Logo URL/));
    await userEvent.type(screen.getByLabelText(/Logo URL/), 'https://example.com/logo.png');
    expect(screen.getByAltText('Logo preview')).toHaveAttribute(
      'src',
      'https://example.com/logo.png',
    );
  });

  it('shows field errors', () => {
    renderStep('brand', { errors: { brandName: 'Brand name must be at least 2 characters' } });
    expect(screen.getByLabelText('Brand or business name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('at least 2 characters');
  });
});

describe('CategoryStep', () => {
  it('lists all categories and asks for details when "Something else" is chosen', async () => {
    const latest = renderStep('category');
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    expect(screen.queryByLabelText('Describe your category')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Something else/ }));
    await userEvent.type(screen.getByLabelText('Describe your category'), 'Pet grooming');
    expect(latest.value).toEqual({ category: 'other', customCategory: 'Pet grooming' });
  });
});

describe('AboutStep', () => {
  it('personalises the question and counts characters', async () => {
    const latest = renderStep('about', { draft: { brand: { brandName: 'Café Luna' } } });
    const description = screen.getByLabelText('What does Café Luna do?');
    await userEvent.type(description, 'We serve coffee.');
    expect(screen.getByText(/^16\/1000/)).toBeInTheDocument();
    expect(latest.value.description).toBe('We serve coffee.');
  });
});

describe('GoalsStep', () => {
  it('selects goals', async () => {
    const latest = renderStep('goals');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sell online' }));
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Get more bookings or appointments' }),
    );
    expect(latest.value.goals).toEqual(['get-bookings', 'sell-online']);
  });
});

describe('PagesStep', () => {
  it('pre-selects category pages and keeps home locked on', async () => {
    const latest = renderStep('pages', { draft: { category: { category: 'hotel' } } });
    expect(screen.getByRole('checkbox', { name: 'Rooms' })).toBeChecked();
    const home = screen.getByRole('checkbox', { name: 'Home' });
    expect(home).toBeChecked();
    expect(home).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Blog' }));
    expect(latest.value.pages).toContain('blog');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Live chat' }));
    expect(latest.value.features).toContain('live-chat');
  });
});

describe('DashboardStep', () => {
  it('hides widgets when no dashboard is wanted', async () => {
    const latest = renderStep('dashboard', { draft: { category: { category: 'doctor' } } });
    expect(screen.getByRole('checkbox', { name: 'Appointments' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /Not right now/ }));
    expect(latest.value.wantsDashboard).toBe(false);
    expect(screen.queryByRole('checkbox', { name: 'Appointments' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Yes, give me a dashboard/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Inventory' }));
    expect(latest.value).toMatchObject({ wantsDashboard: true });
    expect(latest.value.widgets).toContain('inventory');
  });
});

describe('DesignStep', () => {
  it('chooses presets, style and font', async () => {
    const latest = renderStep('design');
    expect(screen.getByRole('radio', { name: 'Ocean' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Forest' }));
    await userEvent.click(screen.getByRole('radio', { name: /Playful/ }));
    await userEvent.click(screen.getByRole('radio', { name: /Editorial/ }));
    expect(latest.value).toMatchObject({
      paletteId: 'forest',
      style: 'playful',
      font: 'editorial',
    });
  });

  it('seeds custom colours from the previous preset', async () => {
    const latest = renderStep('design');
    await userEvent.click(screen.getByRole('radio', { name: 'Minimal Mono' }));
    await userEvent.click(screen.getByRole('radio', { name: /Custom colours/ }));
    expect(latest.value.paletteId).toBe('custom');
    expect(latest.value.customPalette?.primary).toBe('#111827');
    expect(screen.getByLabelText('Primary colour')).toHaveValue('#111827');
  });
});

describe('ContactStep', () => {
  it('edits optional contact details', async () => {
    const latest = renderStep('contact');
    await userEvent.type(screen.getByLabelText(/Email/), 'hi@luna.cafe');
    await userEvent.type(screen.getByLabelText(/Instagram/), 'https://instagram.com/luna');
    expect(latest.value).toMatchObject({
      email: 'hi@luna.cafe',
      instagram: 'https://instagram.com/luna',
    });
  });
});
