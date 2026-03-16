import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers.js';
import { explainConcept } from '../../src/tools/explain-concept.js';
import { formatExplainConcept } from '../../src/format.js';

describe('explain_concept', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Known concept returns full explanation
  it('returns full explanation for a known concept', () => {
    const result = explainConcept(db, { name: 'card advantage' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.concept.name).toBe('card advantage');
      expect(result.concept.category).toBeTruthy();
      expect(result.concept.description).toBeTruthy();
      expect(result.concept.hearthstone_application).toBeTruthy();
    }
  });

  // Case-insensitive
  it('finds concepts case-insensitively', () => {
    const result = explainConcept(db, { name: 'CARD ADVANTAGE' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.concept.name).toBe('card advantage');
    }
  });

  // Unknown concept returns error + suggestions
  it('returns error with suggestions for unknown concept', () => {
    const result = explainConcept(db, { name: 'card' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('card advantage');
    }
  });

  // Completely unknown concept
  it('returns not found for completely unknown concept', () => {
    const result = explainConcept(db, { name: 'xyzzyplugh' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
    }
  });

  // All required fields present
  it('returns all required fields', () => {
    const result = explainConcept(db, { name: 'tempo' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.concept).toHaveProperty('name');
      expect(result.concept).toHaveProperty('category');
      expect(result.concept).toHaveProperty('description');
      expect(result.concept).toHaveProperty('hearthstone_application');
    }
  });

  // Formatter — found result
  it('formatExplainConcept formats found result', () => {
    const result = explainConcept(db, { name: 'tempo' });
    const text = formatExplainConcept(result);
    expect(text).toContain('tempo');
    expect(text).toContain('Category');
    expect(text).toContain('In Hearthstone');
  });

  // Formatter — not found
  it('formatExplainConcept formats not-found result', () => {
    const result = explainConcept(db, { name: 'xyzzyplugh' });
    const text = formatExplainConcept(result);
    expect(text).toBeTruthy();
    expect(text).not.toContain('undefined');
  });
});
