import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers.js';
import { getClassIdentity } from '../../src/tools/get-class-identity.js';
import { formatGetClassIdentity } from '../../src/format.js';

describe('get_class_identity', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Single class returns full profile
  it('returns full profile for a single class', () => {
    const result = getClassIdentity(db, { class_name: 'Mage' });
    expect(result.found).toBe(true);
    if (result.found && !('overview' in result)) {
      expect(result.identity.class).toBe('Mage');
      expect(result.identity.identity).toBeTruthy();
      expect(result.identity.hero_power_name).toBeTruthy();
      expect(result.identity.hero_power_cost).toBe(2);
      expect(result.identity.hero_power_effect).toBeTruthy();
      expect(result.identity.hero_power_implications).toBeTruthy();
      expect(result.identity.historical_archetypes).toBeInstanceOf(Array);
      expect(result.identity.historical_archetypes.length).toBeGreaterThan(0);
      expect(result.identity.strengths).toBeInstanceOf(Array);
      expect(result.identity.weaknesses).toBeInstanceOf(Array);
      expect(result.identity.early_game).toBeTruthy();
      expect(result.identity.mid_game).toBeTruthy();
      expect(result.identity.late_game).toBeTruthy();
    }
  });

  // Case-insensitive
  it('finds classes case-insensitively', () => {
    const result = getClassIdentity(db, { class_name: 'mage' });
    expect(result.found).toBe(true);
    if (result.found && !('overview' in result)) {
      expect(result.identity.class).toBe('Mage');
    }
  });

  // All classes overview returns 11 entries
  it('returns overview of all 11 classes when no class specified', () => {
    const result = getClassIdentity(db, {});
    expect(result.found).toBe(true);
    if (result.found && 'overview' in result) {
      expect(result.overview).toBe(true);
      expect(result.classes.length).toBe(11);
      for (const cls of result.classes) {
        expect(cls.class).toBeTruthy();
        expect(cls.identity).toBeTruthy();
        expect(cls.hero_power_name).toBeTruthy();
      }
    }
  });

  // Unknown class returns error + suggestions
  it('returns error with suggestions for unknown class', () => {
    const result = getClassIdentity(db, { class_name: 'Mag' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('Mage');
    }
  });

  // Historical archetypes parsed from JSON
  it('parses historical_archetypes from JSON', () => {
    const result = getClassIdentity(db, { class_name: 'Warrior' });
    expect(result.found).toBe(true);
    if (result.found && !('overview' in result)) {
      for (const arch of result.identity.historical_archetypes) {
        expect(typeof arch).toBe('string');
      }
    }
  });

  // Formatter — single class
  it('formatGetClassIdentity formats single class result', () => {
    const result = getClassIdentity(db, { class_name: 'Mage' });
    const text = formatGetClassIdentity(result);
    expect(text).toContain('Mage');
    expect(text).toContain('Hero Power');
    expect(text).toContain('Strengths');
    expect(text).toContain('Weaknesses');
  });

  // Formatter — overview
  it('formatGetClassIdentity formats overview result', () => {
    const result = getClassIdentity(db, {});
    const text = formatGetClassIdentity(result);
    expect(text).toContain('Mage');
    expect(text).toContain('Warrior');
    expect(text).toContain('Paladin');
  });

  // Formatter — not found
  it('formatGetClassIdentity formats not-found result', () => {
    const result = getClassIdentity(db, { class_name: 'xyzzyplugh' });
    const text = formatGetClassIdentity(result);
    expect(text).toBeTruthy();
    expect(text).not.toContain('undefined');
  });
});
