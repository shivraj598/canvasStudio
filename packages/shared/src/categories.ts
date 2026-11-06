/**
 * Business categories Canvas Studio knows how to build for, and the sensible defaults
 * (pages, features, dashboard widgets) we pre-select for each one in the questionnaire.
 */

export const BUSINESS_CATEGORIES = [
  'doctor',
  'teacher',
  'restaurant',
  'hotel',
  'salon',
  'consultant',
  'retail',
  'portfolio',
  'nonprofit',
  'other',
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const SITE_PAGES = [
  'home',
  'about',
  'services',
  'menu',
  'rooms',
  'courses',
  'team',
  'gallery',
  'testimonials',
  'pricing',
  'faq',
  'blog',
  'contact',
] as const;
export type SitePageId = (typeof SITE_PAGES)[number];

export const SITE_FEATURES = [
  'contact-form',
  'online-booking',
  'online-ordering',
  'newsletter',
  'map',
  'live-chat',
] as const;
export type SiteFeature = (typeof SITE_FEATURES)[number];

export const DASHBOARD_WIDGETS = [
  'appointments',
  'reservations',
  'orders',
  'messages',
  'analytics',
  'customers',
  'students',
  'inventory',
  'reviews',
] as const;
export type DashboardWidget = (typeof DASHBOARD_WIDGETS)[number];

export const WEBSITE_GOALS = [
  'get-bookings',
  'attract-customers',
  'showcase-work',
  'sell-online',
  'share-information',
  'build-trust',
  'collect-leads',
] as const;
export type WebsiteGoal = (typeof WEBSITE_GOALS)[number];

export interface CategoryInfo {
  id: BusinessCategory;
  label: string;
  description: string;
  defaultPages: SitePageId[];
  defaultFeatures: SiteFeature[];
  defaultWidgets: DashboardWidget[];
}

export const CATEGORY_INFO: Record<BusinessCategory, CategoryInfo> = {
  doctor: {
    id: 'doctor',
    label: 'Doctor / Clinic',
    description: 'Clinics, doctors, dentists, therapists and other healthcare practices.',
    defaultPages: ['home', 'about', 'services', 'team', 'testimonials', 'faq', 'contact'],
    defaultFeatures: ['online-booking', 'contact-form', 'map'],
    defaultWidgets: ['appointments', 'messages', 'customers'],
  },
  teacher: {
    id: 'teacher',
    label: 'Teacher / Tutor',
    description: 'Teachers, tutors, coaches, schools and online course creators.',
    defaultPages: ['home', 'about', 'courses', 'testimonials', 'pricing', 'contact'],
    defaultFeatures: ['online-booking', 'contact-form', 'newsletter'],
    defaultWidgets: ['students', 'appointments', 'messages'],
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant / Café',
    description: 'Restaurants, cafés, bakeries, bars and food trucks.',
    defaultPages: ['home', 'about', 'menu', 'gallery', 'testimonials', 'contact'],
    defaultFeatures: ['online-ordering', 'online-booking', 'map'],
    defaultWidgets: ['orders', 'reservations', 'reviews'],
  },
  hotel: {
    id: 'hotel',
    label: 'Hotel / Stay',
    description: 'Hotels, guest houses, B&Bs, resorts and holiday rentals.',
    defaultPages: ['home', 'about', 'rooms', 'gallery', 'testimonials', 'faq', 'contact'],
    defaultFeatures: ['online-booking', 'map', 'contact-form'],
    defaultWidgets: ['reservations', 'customers', 'reviews'],
  },
  salon: {
    id: 'salon',
    label: 'Salon / Wellness',
    description: 'Hair and beauty salons, spas, gyms and wellness studios.',
    defaultPages: ['home', 'services', 'pricing', 'gallery', 'team', 'contact'],
    defaultFeatures: ['online-booking', 'map'],
    defaultWidgets: ['appointments', 'customers', 'reviews'],
  },
  consultant: {
    id: 'consultant',
    label: 'Consultant / Professional',
    description: 'Lawyers, accountants, consultants, agencies and other professional services.',
    defaultPages: ['home', 'about', 'services', 'testimonials', 'blog', 'contact'],
    defaultFeatures: ['contact-form', 'online-booking', 'newsletter'],
    defaultWidgets: ['appointments', 'messages', 'analytics'],
  },
  retail: {
    id: 'retail',
    label: 'Shop / Retail',
    description: 'Local shops and online stores selling products.',
    defaultPages: ['home', 'about', 'services', 'gallery', 'faq', 'contact'],
    defaultFeatures: ['online-ordering', 'newsletter', 'map'],
    defaultWidgets: ['orders', 'inventory', 'analytics'],
  },
  portfolio: {
    id: 'portfolio',
    label: 'Personal / Portfolio',
    description: 'Freelancers, creatives and anyone showcasing their work.',
    defaultPages: ['home', 'about', 'gallery', 'testimonials', 'contact'],
    defaultFeatures: ['contact-form'],
    defaultWidgets: ['messages', 'analytics'],
  },
  nonprofit: {
    id: 'nonprofit',
    label: 'Nonprofit / Community',
    description: 'Charities, community groups, clubs and places of worship.',
    defaultPages: ['home', 'about', 'team', 'gallery', 'blog', 'contact'],
    defaultFeatures: ['newsletter', 'contact-form', 'map'],
    defaultWidgets: ['messages', 'analytics'],
  },
  other: {
    id: 'other',
    label: 'Something else',
    description: 'Tell us about it and we will tailor the site to you.',
    defaultPages: ['home', 'about', 'services', 'contact'],
    defaultFeatures: ['contact-form'],
    defaultWidgets: ['messages'],
  },
};

export const PAGE_LABELS: Record<SitePageId, string> = {
  home: 'Home',
  about: 'About',
  services: 'Services',
  menu: 'Menu',
  rooms: 'Rooms',
  courses: 'Courses',
  team: 'Team',
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  pricing: 'Pricing',
  faq: 'FAQ',
  blog: 'Blog',
  contact: 'Contact',
};

export const FEATURE_LABELS: Record<SiteFeature, string> = {
  'contact-form': 'Contact form',
  'online-booking': 'Online booking / appointments',
  'online-ordering': 'Online ordering',
  newsletter: 'Newsletter sign-up',
  map: 'Location map',
  'live-chat': 'Live chat',
};

export const WIDGET_LABELS: Record<DashboardWidget, string> = {
  appointments: 'Appointments',
  reservations: 'Reservations',
  orders: 'Orders',
  messages: 'Messages & enquiries',
  analytics: 'Visitor analytics',
  customers: 'Customers / patients',
  students: 'Students',
  inventory: 'Inventory',
  reviews: 'Reviews',
};

export const GOAL_LABELS: Record<WebsiteGoal, string> = {
  'get-bookings': 'Get more bookings or appointments',
  'attract-customers': 'Attract new customers',
  'showcase-work': 'Showcase my work',
  'sell-online': 'Sell online',
  'share-information': 'Share information',
  'build-trust': 'Build trust and credibility',
  'collect-leads': 'Collect leads and enquiries',
};

export function getCategoryInfo(category: BusinessCategory): CategoryInfo {
  return CATEGORY_INFO[category];
}
