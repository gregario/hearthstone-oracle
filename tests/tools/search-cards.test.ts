import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers.js';
import { searchCards } from '../../src/tools/search-cards.js';

describe('search_cards', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // FTS5 search by name
  it('finds cards by name via FTS5', () => {
    const result = searchCards(db, { query: 'Reno' });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Reno Jackson');
    expect(result.total).toBe(1);
  });

  // FTS5 search by text
  it('finds cards by text via FTS5', () => {
    const result = searchCards(db, { query: 'damage' });
    expect(result.cards.some(c => c.name === 'Fireball')).toBe(true);
  });

  // Filter by class
  it('filters by player_class', () => {
    const result = searchCards(db, { player_class: 'MAGE' });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Fireball');
  });

  // Filter by cost (eq)
  it('filters by mana_cost with default eq operator', () => {
    const result = searchCards(db, { mana_cost: 1 });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Stonetusk Boar');
  });

  // Filter by cost with operator
  it('filters by mana_cost with gte operator', () => {
    const result = searchCards(db, { mana_cost: 6, cost_op: 'gte' });
    const names = result.cards.map(c => c.name);
    expect(names).toContain('Reno Jackson');
    expect(names).toContain('Tirion Fordring');
    expect(result.cards.every(c => (c.mana_cost ?? 0) >= 6)).toBe(true);
  });

  // Filter by type
  it('filters by type', () => {
    const result = searchCards(db, { type: 'WEAPON' });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Fiery War Axe');
  });

  // Filter by rarity
  it('filters by rarity', () => {
    const result = searchCards(db, { rarity: 'LEGENDARY' });
    const names = result.cards.map(c => c.name);
    expect(names).toContain('Reno Jackson');
    expect(names).toContain('Tirion Fordring');
    expect(result.cards).toHaveLength(2);
  });

  // Filter by keyword
  it('filters by keyword in keywords JSON', () => {
    const result = searchCards(db, { keyword: 'CHARGE' });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Stonetusk Boar');
  });

  // Filter by race
  it('filters by race', () => {
    const result = searchCards(db, { race: 'BEAST' });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Stonetusk Boar');
  });

  // Combined: query + class filter
  it('combines FTS query with class filter', () => {
    const result = searchCards(db, { query: 'damage', player_class: 'MAGE' });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].name).toBe('Fireball');
  });

  // Empty results
  it('returns empty array when no matches', () => {
    const result = searchCards(db, { query: 'nonexistentcard' });
    expect(result.cards).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // collectible_only default
  it('filters collectible only by default', () => {
    // Insert a non-collectible card
    db.prepare(`
      INSERT INTO cards (id, name, mana_cost, type, player_class, collectible)
      VALUES ('99999', 'Hidden Card', 1, 'MINION', 'NEUTRAL', 0)
    `).run();
    // Sync FTS
    db.prepare(`
      INSERT INTO cards_fts(rowid, name, text)
      SELECT rowid, name, text FROM cards WHERE id = '99999'
    `).run();

    const result = searchCards(db, { query: 'Hidden' });
    expect(result.cards).toHaveLength(0);

    // With collectible_only=false
    const result2 = searchCards(db, { query: 'Hidden', collectible_only: false });
    expect(result2.cards).toHaveLength(1);
  });

  // Limit respected
  it('respects limit parameter', () => {
    const result = searchCards(db, { limit: 2 });
    expect(result.cards.length).toBeLessThanOrEqual(2);
  });

  // Result shape
  it('returns CardSummary shape with expected fields', () => {
    const result = searchCards(db, { query: 'Reno' });
    const card = result.cards[0];
    expect(card).toHaveProperty('name');
    expect(card).toHaveProperty('mana_cost');
    expect(card).toHaveProperty('type');
    expect(card).toHaveProperty('player_class');
    expect(card).toHaveProperty('rarity');
    expect(card).toHaveProperty('text');
    expect(card).toHaveProperty('attack');
    expect(card).toHaveProperty('health');
    expect(card).toHaveProperty('keywords');
  });

  // Keywords parsed
  it('parses keywords from JSON to string array', () => {
    const result = searchCards(db, { query: 'Tirion' });
    expect(result.cards[0].keywords).toEqual(['DIVINE_SHIELD', 'TAUNT', 'DEATHRATTLE']);
  });

  // Cost operators
  it('filters with lt operator', () => {
    const result = searchCards(db, { mana_cost: 4, cost_op: 'lt' });
    expect(result.cards.every(c => (c.mana_cost ?? 0) < 4)).toBe(true);
  });

  it('filters with gt operator', () => {
    const result = searchCards(db, { mana_cost: 4, cost_op: 'gt' });
    expect(result.cards.every(c => (c.mana_cost ?? 0) > 4)).toBe(true);
  });

  it('filters with lte operator', () => {
    const result = searchCards(db, { mana_cost: 4, cost_op: 'lte' });
    expect(result.cards.every(c => (c.mana_cost ?? 0) <= 4)).toBe(true);
  });
});
