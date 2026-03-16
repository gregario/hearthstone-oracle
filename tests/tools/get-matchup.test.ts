import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers.js';
import { getMatchup } from '../../src/tools/get-matchup.js';
import { formatGetMatchup } from '../../src/format.js';

describe('get_matchup', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Known matchup returns dynamics
  it('returns matchup dynamics for known pairing', () => {
    const result = getMatchup(db, { archetype_a: 'aggro', archetype_b: 'control' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.matchup.archetype_a).toBeTruthy();
      expect(result.matchup.archetype_b).toBeTruthy();
      expect(result.matchup.favoured).toBeTruthy();
      expect(result.matchup.reasoning).toBeTruthy();
      expect(result.matchup.key_tension).toBeTruthy();
      expect(result.matchup.archetype_a_priority).toBeTruthy();
      expect(result.matchup.archetype_b_priority).toBeTruthy();
    }
  });

  // Reverse order still finds the matchup
  it('finds matchup when archetypes are given in reverse order', () => {
    const result = getMatchup(db, { archetype_a: 'control', archetype_b: 'aggro' });
    expect(result.found).toBe(true);
    if (result.found) {
      // Should still return the data (order may be canonical or swapped)
      expect(result.matchup.favoured).toBeTruthy();
      expect(result.matchup.reasoning).toBeTruthy();
    }
  });

  // Mirror matchup works
  it('returns mirror matchup dynamics', () => {
    const result = getMatchup(db, { archetype_a: 'aggro', archetype_b: 'aggro' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.matchup.favoured).toBe('even');
    }
  });

  // Case-insensitive
  it('finds matchups case-insensitively', () => {
    const result = getMatchup(db, { archetype_a: 'AGGRO', archetype_b: 'CONTROL' });
    expect(result.found).toBe(true);
  });

  // Unknown archetype returns error
  it('returns error for unknown archetype', () => {
    const result = getMatchup(db, { archetype_a: 'aggro', archetype_b: 'xyzzyplugh' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
    }
  });

  // Formatter — found result
  it('formatGetMatchup formats found result', () => {
    const result = getMatchup(db, { archetype_a: 'aggro', archetype_b: 'control' });
    const text = formatGetMatchup(result);
    expect(text).toContain('vs');
    expect(text).toContain('Favoured');
    expect(text).toContain('Key Tension');
  });

  // Formatter — not found
  it('formatGetMatchup formats not-found result', () => {
    const result = getMatchup(db, { archetype_a: 'aggro', archetype_b: 'xyzzyplugh' });
    const text = formatGetMatchup(result);
    expect(text).toBeTruthy();
    expect(text).not.toContain('undefined');
  });
});
