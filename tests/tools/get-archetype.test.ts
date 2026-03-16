import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers.js';
import { getArchetype } from '../../src/tools/get-archetype.js';
import { formatGetArchetype } from '../../src/format.js';

describe('get_archetype', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Known archetype returns full data with all fields
  it('returns full data for a known archetype', () => {
    const result = getArchetype(db, { name: 'aggro' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.archetype.name).toBe('aggro');
      expect(result.archetype.description).toBeTruthy();
      expect(result.archetype.gameplan).toBeTruthy();
      expect(result.archetype.win_conditions).toBeInstanceOf(Array);
      expect(result.archetype.win_conditions.length).toBeGreaterThan(0);
      expect(result.archetype.strengths).toBeInstanceOf(Array);
      expect(result.archetype.strengths.length).toBeGreaterThan(0);
      expect(result.archetype.weaknesses).toBeInstanceOf(Array);
      expect(result.archetype.weaknesses.length).toBeGreaterThan(0);
      expect(result.archetype.example_decks).toBeInstanceOf(Array);
      expect(result.archetype.example_decks.length).toBeGreaterThan(0);
    }
  });

  // Case-insensitive lookup
  it('finds archetypes case-insensitively', () => {
    const result = getArchetype(db, { name: 'AGGRO' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.archetype.name).toBe('aggro');
    }
  });

  // Unknown archetype returns error + suggestions
  it('returns error with suggestions for unknown archetype', () => {
    const result = getArchetype(db, { name: 'aggr' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('aggro');
    }
  });

  // Completely unknown archetype
  it('returns not found for completely unknown archetype', () => {
    const result = getArchetype(db, { name: 'xyzzyplugh' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
    }
  });

  // JSON arrays parsed correctly
  it('parses JSON arrays correctly for win_conditions, strengths, weaknesses', () => {
    const result = getArchetype(db, { name: 'control' });
    expect(result.found).toBe(true);
    if (result.found) {
      // All should be real string arrays, not JSON strings
      for (const wc of result.archetype.win_conditions) {
        expect(typeof wc).toBe('string');
      }
      for (const s of result.archetype.strengths) {
        expect(typeof s).toBe('string');
      }
      for (const w of result.archetype.weaknesses) {
        expect(typeof w).toBe('string');
      }
      for (const ed of result.archetype.example_decks) {
        expect(typeof ed).toBe('string');
      }
    }
  });

  // Formatter — found result
  it('formatGetArchetype formats found result', () => {
    const result = getArchetype(db, { name: 'aggro' });
    const text = formatGetArchetype(result);
    expect(text).toContain('aggro');
    expect(text).toContain('Gameplan');
    expect(text).toContain('Win Conditions');
    expect(text).toContain('Strengths');
    expect(text).toContain('Weaknesses');
  });

  // Formatter — not found result
  it('formatGetArchetype formats not-found result', () => {
    const result = getArchetype(db, { name: 'xyzzyplugh' });
    const text = formatGetArchetype(result);
    expect(text).toBeTruthy();
    expect(text).not.toContain('undefined');
  });
});
