import type { StepId } from '@canvas/shared';
import type { ComponentType } from 'react';
import type { StepProps } from '../types';
import { AboutStep } from './AboutStep';
import { BrandStep } from './BrandStep';
import { CategoryStep } from './CategoryStep';
import { ContactStep } from './ContactStep';
import { DashboardStep } from './DashboardStep';
import { DesignStep } from './DesignStep';
import { GoalsStep } from './GoalsStep';
import { PagesStep } from './PagesStep';

export const STEP_COMPONENTS: { [S in StepId]: ComponentType<StepProps<S>> } = {
  brand: BrandStep,
  category: CategoryStep,
  about: AboutStep,
  goals: GoalsStep,
  pages: PagesStep,
  dashboard: DashboardStep,
  design: DesignStep,
  contact: ContactStep,
};

/** Renders the form for any questionnaire step. */
export function StepFields<S extends StepId>({ step, ...props }: StepProps<S> & { step: S }) {
  const Component = STEP_COMPONENTS[step] as ComponentType<StepProps<S>>;
  return <Component {...props} />;
}
