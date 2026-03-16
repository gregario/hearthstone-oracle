import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers.js';
import { getKeyword } from '../../src/tools/get-keyword.js';
import { formatGetKeyword } from '../../src/format.js';

describe('get_keyword', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Known keyword returns definition and cards
  it('returns keyword definition and related cards', () => {
    const result = getKeyword(db, { name: 'Battlecry' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.keyword.name).toBe('Battlecry');
      expect(result.keyword.description).toBeTruthy();
      expect(result.keyword.related_keywords).toBeInstanceOf(Array);
      // Reno Jackson has BATTLECRY mechanic
      const cardNames = result.cards.map((c) => c.name);
      expect(cardNames).toContain('Reno Jackson');
    }
  });

  // Case-insensitive lookup
  it('finds keywords case-insensitively', () => {
    const result = getKeyword(db, { name: 'battlecry' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.keyword.name).toBe('Battlecry');
    }
  });

  // Unknown keyword returns error with suggestions
  it('returns error with suggestions for unknown keyword', () => {
    // Use a name that partially matches a keyword table entry but NOT any card mechanic
    const result = getKeyword(db, { name: 'Spellbur' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('Spellburst');
    }
  });

  // Keyword with class filter narrows card results
  it('filters cards by class when player_class is provided', () => {
    const result = getKeyword(db, { name: 'Taunt', player_class: 'PALADIN' });
    expect(result.found).toBe(true);
    if (result.found) {
      // Tirion is PALADIN with TAUNT; Reno is NEUTRAL
      for (const card of result.cards) {
        expect(card.player_class).toBe('PALADIN');
      }
      const cardNames = result.cards.map((c) => c.name);
      expect(cardNames).toContain('Tirion Fordring');
    }
  });

  // Keywords found in cards even if not in keywords table (fallback to JSON search)
  it('finds cards with keyword even when keyword is not in keywords table', () => {
    // CHARGE is in cards (Stonetusk Boar) but let's query with the exact mechanic name
    // that might not be in the keywords table
    const result = getKeyword(db, { name: 'Charge' });
    expect(result.found).toBe(true);
    if (result.found) {
      const cardNames = result.cards.map((c) => c.name);
      expect(cardNames).toContain('Stonetusk Boar');
    }
  });

  // Completely unknown keyword with no matching cards
  it('returns not found for completely unknown keyword', () => {
    const result = getKeyword(db, { name: 'Xyzzyplugh' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
    }
  });

  // Cards include proper CardSummary fields
  it('returns cards with proper CardSummary shape', () => {
    const result = getKeyword(db, { name: 'Deathrattle' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.cards.length).toBeGreaterThan(0);
      const card = result.cards[0];
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('mana_cost');
      expect(card).toHaveProperty('type');
      expect(card).toHaveProperty('player_class');
      expect(card).toHaveProperty('keywords');
    }
  });

  // Formatter
  it('formatGetKeyword formats found result', () => {
    const result = getKeyword(db, { name: 'Battlecry' });
    const text = formatGetKeyword(result);
    expect(text).toContain('Battlecry');
    expect(text).toContain('Reno Jackson');
  });

  it('formatGetKeyword formats not-found result', () => {
    const result = getKeyword(db, { name: 'Xyzzyplugh' });
    const text = formatGetKeyword(result);
    expect(text).not.toContain('undefined');
    expect(text).toBeTruthy();
  });
});
