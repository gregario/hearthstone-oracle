import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers.js';
import { getCard } from '../../src/tools/get-card.js';

describe('get_card', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Exact name match
  it('returns full card details on exact name match', () => {
    const result = getCard(db, { name: 'Reno Jackson' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.card.name).toBe('Reno Jackson');
      expect(result.card.mana_cost).toBe(6);
      expect(result.card.attack).toBe(4);
      expect(result.card.health).toBe(6);
      expect(result.card.type).toBe('MINION');
      expect(result.card.player_class).toBe('NEUTRAL');
      expect(result.card.rarity).toBe('LEGENDARY');
      expect(result.card.text).toContain('Battlecry');
    }
  });

  // Case-insensitive match
  it('finds cards case-insensitively', () => {
    const result = getCard(db, { name: 'reno jackson' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.card.name).toBe('Reno Jackson');
    }
  });

  // Fuzzy match (partial name via LIKE)
  it('falls back to fuzzy match on partial name', () => {
    const result = getCard(db, { name: 'Reno' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.card.name).toBe('Reno Jackson');
    }
  });

  // Not found returns suggestions
  it('returns suggestions when card is not found', () => {
    const result = getCard(db, { name: 'Zephyrus' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toBeTruthy();
    }
  });

  // Keywords parsed from JSON to string array
  it('parses keywords from JSON to string array', () => {
    const result = getCard(db, { name: 'Tirion Fordring' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.card.keywords).toEqual(['DIVINE_SHIELD', 'TAUNT', 'DEATHRATTLE']);
    }
  });

  // Null keywords become empty array
  it('returns empty keywords array when card has no keywords', () => {
    const result = getCard(db, { name: 'Fiery War Axe' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.card.keywords).toEqual([]);
    }
  });

  // Full CardDetail shape
  it('returns all CardDetail fields', () => {
    const result = getCard(db, { name: 'Stonetusk Boar' });
    expect(result.found).toBe(true);
    if (result.found) {
      const card = result.card;
      expect(card.name).toBe('Stonetusk Boar');
      expect(card.mana_cost).toBe(1);
      expect(card.attack).toBe(1);
      expect(card.health).toBe(1);
      expect(card.type).toBe('MINION');
      expect(card.race).toBe('BEAST');
      expect(card.keywords).toEqual(['CHARGE']);
    }
  });

  // Weapon card
  it('returns weapon-specific fields', () => {
    const result = getCard(db, { name: 'Fiery War Axe' });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.card.attack).toBe(3);
      expect(result.card.durability).toBe(2);
      expect(result.card.type).toBe('WEAPON');
    }
  });

  // Suggestions based on first word
  it('provides suggestions based on first word of query', () => {
    const result = getCard(db, { name: 'Fiery Something' });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('Fiery War Axe');
    }
  });
});
