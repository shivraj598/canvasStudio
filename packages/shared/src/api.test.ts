import { describe, expect, it } from 'vitest';
import { createProjectSchema, devLoginSchema, saveStepSchema } from './api.js';

describe('API contracts', () => {
  it('validates dev login input', () => {
    expect(devLoginSchema.safeParse({ email: 'a@b.co', name: 'Asha' }).success).toBe(true);
    expect(devLoginSchema.safeParse({ email: 'nope', name: 'Asha' }).success).toBe(false);
    expect(devLoginSchema.safeParse({ email: 'a@b.co', name: '   ' }).success).toBe(false);
  });

  it('allows creating a project with or without a name', () => {
    expect(createProjectSchema.parse({})).toEqual({});
    expect(createProjectSchema.parse({ name: '  My clinic ' })).toEqual({ name: 'My clinic' });
    expect(createProjectSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('only accepts known questionnaire steps when saving', () => {
    expect(saveStepSchema.safeParse({ step: 'brand', data: {} }).success).toBe(true);
    expect(saveStepSchema.safeParse({ step: 'billing', data: {} }).success).toBe(false);
  });
});
