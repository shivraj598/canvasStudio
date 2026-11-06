/** Sample data for tests across the monorepo. Import from `@canvas/shared/testing`. */
import type { QuestionnaireAnswers } from '../questionnaire.js';

export const completeAnswers: QuestionnaireAnswers = {
  brand: { brandName: 'Sunrise Dental', tagline: 'Smiles that last' },
  category: { category: 'doctor' },
  about: {
    description: 'A family dental clinic offering check-ups, whitening and braces since 2009.',
    audience: 'Families in Kathmandu',
  },
  goals: { goals: ['get-bookings', 'build-trust'] },
  pages: { pages: ['home', 'about', 'services', 'contact'], features: ['online-booking'] },
  dashboard: { wantsDashboard: true, widgets: ['appointments', 'messages'] },
  design: { paletteId: 'clinic', style: 'modern', font: 'modern-sans' },
  contact: { email: 'hello@sunrise.dental', phone: '+977 1 555 0100' },
};

export const restaurantAnswers: QuestionnaireAnswers = {
  brand: { brandName: 'Café Luna' },
  category: { category: 'restaurant' },
  about: {
    description: 'Wood-fired pizza, fresh pasta and the best espresso in Lalitpur.',
    location: 'Jhamsikhel, Lalitpur',
  },
  goals: { goals: ['attract-customers', 'sell-online'] },
  pages: { pages: ['home', 'menu', 'gallery', 'contact'], features: ['online-ordering', 'map'] },
  dashboard: { wantsDashboard: false, widgets: [] },
  design: { paletteId: 'espresso', style: 'classic', font: 'classic-serif' },
  contact: { address: 'Jhamsikhel Road, Lalitpur' },
};
