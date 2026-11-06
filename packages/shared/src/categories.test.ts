import { describe, expect, it } from 'vitest';
import {
  BUSINESS_CATEGORIES,
  CATEGORY_INFO,
  DASHBOARD_WIDGETS,
  FEATURE_LABELS,
  GOAL_LABELS,
  PAGE_LABELS,
  SITE_FEATURES,
  SITE_PAGES,
  WEBSITE_GOALS,
  WIDGET_LABELS,
  getCategoryInfo,
} from './categories.js';

describe('categories', () => {
  it('describe every category', () => {
    for (const category of BUSINESS_CATEGORIES) {
      const info = getCategoryInfo(category);
      expect(info.id).toBe(category);
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
    }
  });

  it('always include home and contact pages by default', () => {
    for (const info of Object.values(CATEGORY_INFO)) {
      expect(info.defaultPages[0], info.id).toBe('home');
      expect(info.defaultPages, info.id).toContain('contact');
    }
  });

  it('only reference known pages, features and widgets', () => {
    for (const info of Object.values(CATEGORY_INFO)) {
      info.defaultPages.forEach((p) => expect(SITE_PAGES).toContain(p));
      info.defaultFeatures.forEach((f) => expect(SITE_FEATURES).toContain(f));
      info.defaultWidgets.forEach((w) => expect(DASHBOARD_WIDGETS).toContain(w));
    }
  });

  it('suggest category-appropriate pages', () => {
    expect(CATEGORY_INFO.restaurant.defaultPages).toContain('menu');
    expect(CATEGORY_INFO.hotel.defaultPages).toContain('rooms');
    expect(CATEGORY_INFO.teacher.defaultPages).toContain('courses');
    expect(CATEGORY_INFO.doctor.defaultFeatures).toContain('online-booking');
  });
});

describe('labels', () => {
  it('exist for every page, feature, widget and goal', () => {
    SITE_PAGES.forEach((p) => expect(PAGE_LABELS[p]).toBeTruthy());
    SITE_FEATURES.forEach((f) => expect(FEATURE_LABELS[f]).toBeTruthy());
    DASHBOARD_WIDGETS.forEach((w) => expect(WIDGET_LABELS[w]).toBeTruthy());
    WEBSITE_GOALS.forEach((g) => expect(GOAL_LABELS[g]).toBeTruthy());
  });
});
