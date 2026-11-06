/**
 * Starter copy per category. The template generator uses it to fill sections the user has not
 * written content for yet; an AI copywriter can replace this later.
 */
import type { BusinessCategory, SectionItem } from '@canvas/shared';

export interface CategoryContent {
  offeringsHeading: string;
  offerings: SectionItem[];
  primaryCta: string;
  faq: SectionItem[];
}

const GENERIC_FAQ: SectionItem[] = [
  {
    title: 'How can I get in touch?',
    description: 'Use the contact page — we usually reply within one business day.',
  },
  {
    title: 'Where are you located?',
    description: 'You can find our address and a map on the contact page.',
  },
];

export const CATEGORY_CONTENT: Record<BusinessCategory, CategoryContent> = {
  doctor: {
    offeringsHeading: 'Our services',
    offerings: [
      {
        title: 'General consultations',
        description: 'Thorough, unhurried appointments for the whole family.',
      },
      { title: 'Preventive check-ups', description: 'Regular screenings to catch problems early.' },
      {
        title: 'Specialist care',
        description: 'Expert treatment and referrals when you need them.',
      },
    ],
    primaryCta: 'Book an appointment',
    faq: [
      {
        title: 'Do I need an appointment?',
        description: 'Appointments are recommended; walk-ins are seen when possible.',
      },
      {
        title: 'Which insurance do you accept?',
        description: 'Contact us and we will confirm your coverage before your visit.',
      },
      ...GENERIC_FAQ,
    ],
  },
  teacher: {
    offeringsHeading: 'Courses & classes',
    offerings: [
      {
        title: 'One-to-one tutoring',
        description: 'Personal lessons tailored to each student.',
        meta: 'All levels',
      },
      {
        title: 'Group classes',
        description: 'Learn together in small, focused groups.',
        meta: 'Weekly',
      },
      {
        title: 'Exam preparation',
        description: 'Structured revision and practice papers.',
        meta: 'Seasonal',
      },
    ],
    primaryCta: 'Book a lesson',
    faq: [
      {
        title: 'Do you teach online?',
        description: 'Yes — lessons are available online and in person.',
      },
      {
        title: 'Is there a trial lesson?',
        description: 'Get in touch to arrange a short introductory session.',
      },
      ...GENERIC_FAQ,
    ],
  },
  restaurant: {
    offeringsHeading: 'Our menu',
    offerings: [
      {
        title: 'House special',
        description: 'Our signature dish, made fresh every day.',
        meta: '$14',
      },
      { title: 'Seasonal salad', description: 'Local produce with a house dressing.', meta: '$9' },
      {
        title: 'Dessert of the day',
        description: 'Ask your server for today’s sweet treat.',
        meta: '$6',
      },
    ],
    primaryCta: 'Reserve a table',
    faq: [
      { title: 'Do you take reservations?', description: 'Yes — book online or give us a call.' },
      {
        title: 'Do you cater for dietary needs?',
        description: 'Vegetarian, vegan and gluten-free options are available.',
      },
      ...GENERIC_FAQ,
    ],
  },
  hotel: {
    offeringsHeading: 'Rooms & suites',
    offerings: [
      {
        title: 'Standard room',
        description: 'Comfortable and quiet, with everything you need.',
        meta: 'From $80 / night',
      },
      {
        title: 'Deluxe room',
        description: 'Extra space and a view to remember.',
        meta: 'From $120 / night',
      },
      {
        title: 'Family suite',
        description: 'Room for everyone, with a separate lounge.',
        meta: 'From $180 / night',
      },
    ],
    primaryCta: 'Check availability',
    faq: [
      {
        title: 'What time is check-in?',
        description: 'Check-in is from 2pm and check-out by 11am.',
      },
      { title: 'Is breakfast included?', description: 'Breakfast is included with most rates.' },
      ...GENERIC_FAQ,
    ],
  },
  salon: {
    offeringsHeading: 'Treatments',
    offerings: [
      {
        title: 'Cut & style',
        description: 'A fresh look from our experienced stylists.',
        meta: 'From $35',
      },
      { title: 'Colour', description: 'Natural tones to bold transformations.', meta: 'From $60' },
      { title: 'Spa & wellness', description: 'Relaxing treatments to unwind.', meta: 'From $45' },
    ],
    primaryCta: 'Book a treatment',
    faq: GENERIC_FAQ,
  },
  consultant: {
    offeringsHeading: 'How we help',
    offerings: [
      { title: 'Initial consultation', description: 'Understand your situation and options.' },
      { title: 'Ongoing advice', description: 'Expert support whenever you need it.' },
      { title: 'Project work', description: 'Clear scope, clear pricing, delivered on time.' },
    ],
    primaryCta: 'Book a consultation',
    faq: GENERIC_FAQ,
  },
  retail: {
    offeringsHeading: 'Shop our range',
    offerings: [
      { title: 'New arrivals', description: 'The latest additions to our collection.' },
      { title: 'Best sellers', description: 'Customer favourites, always in stock.' },
      { title: 'Gift ideas', description: 'Something special for someone special.' },
    ],
    primaryCta: 'Shop now',
    faq: [
      { title: 'Do you deliver?', description: 'Yes — delivery options are shown at checkout.' },
      {
        title: 'What is your returns policy?',
        description: 'Unused items can be returned within 30 days.',
      },
      ...GENERIC_FAQ,
    ],
  },
  portfolio: {
    offeringsHeading: 'What I do',
    offerings: [
      { title: 'Selected work', description: 'A few projects I am proud of.' },
      { title: 'Collaborations', description: 'Working with teams and brands.' },
      { title: 'Commissions', description: 'Open for new projects.' },
    ],
    primaryCta: 'Work with me',
    faq: GENERIC_FAQ,
  },
  nonprofit: {
    offeringsHeading: 'Our work',
    offerings: [
      { title: 'Programmes', description: 'Making a difference in our community.' },
      { title: 'Volunteering', description: 'Join us and lend a hand.' },
      { title: 'Events', description: 'Come along and get involved.' },
    ],
    primaryCta: 'Get involved',
    faq: GENERIC_FAQ,
  },
  other: {
    offeringsHeading: 'What we offer',
    offerings: [
      { title: 'Our services', description: 'Everything we do, done well.' },
      { title: 'Our approach', description: 'Friendly, reliable and personal.' },
      { title: 'Our promise', description: 'We are here when you need us.' },
    ],
    primaryCta: 'Get in touch',
    faq: GENERIC_FAQ,
  },
};
