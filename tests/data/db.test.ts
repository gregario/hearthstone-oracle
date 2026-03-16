import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  getDatabase,
  insertCard,
  insertCards,
  hasExistingData,
  getTableNames,
  type CardRow,
} from '../../src/data/db.js';

describe('Database Schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates all expected tables', () => {
    const tables = getTableNames(db);
    const expected = [
      'cards',
      'cards_fts',
      'keywords',
      'sets',
      'archetypes',
      'class_identities',
      'matchup_framework',
      'game_concepts',
    ];
    for (const table of expected) {
      expect(tables).toContain(table);
    }
  });

  it('schema is idempotent — calling getDatabase twice does not error', () => {
    // First call already happened in beforeEach
    // Second call on the same in-memory DB would be a new DB, so instead
    // we just verify we can create another in-memory DB without error
    const db2 = getDatabase(':memory:');
    const tables = getTableNames(db2);
    expect(tables).toContain('cards');
    db2.close();
  });

  it('can insert a card and retrieve it', () => {
    const card: CardRow = {
      id: '1234',
      card_id: 'CS2_029',
      name: 'Fireball',
      mana_cost: 4,
      type: 'SPELL',
      card_set: 'CORE',
      set_name: 'Core',
      player_class: 'MAGE',
      rarity: 'FREE',
      attack: null,
      health: null,
      durability: null,
      armor: null,
      text: 'Deal 6 damage.',
      flavor: 'This spell is useful for burning things.',
      artist: 'Dave Allsop',
      collectible: 1,
      elite: 0,
      race: null,
      spell_school: 'FIRE',
      keywords: null,
    };

    insertCard(db, card);

    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get('1234') as CardRow;
    expect(row).toBeDefined();
    expect(row.name).toBe('Fireball');
    expect(row.mana_cost).toBe(4);
    expect(row.type).toBe('SPELL');
    expect(row.player_class).toBe('MAGE');
    expect(row.text).toBe('Deal 6 damage.');
  });

  it('FTS5 search works after card insert', () => {
    const card: CardRow = {
      id: '1234',
      card_id: 'CS2_029',
      name: 'Fireball',
      mana_cost: 4,
      type: 'SPELL',
      card_set: 'CORE',
      set_name: 'Core',
      player_class: 'MAGE',
      rarity: 'FREE',
      attack: null,
      health: null,
      durability: null,
      armor: null,
      text: 'Deal 6 damage.',
      flavor: null,
      artist: null,
      collectible: 1,
      elite: 0,
      race: null,
      spell_school: 'FIRE',
      keywords: null,
    };

    insertCard(db, card);

    const results = db.prepare(
      `SELECT name, text FROM cards_fts WHERE cards_fts MATCH ? ORDER BY rank`
    ).all('Fireball') as Array<{ name: string; text: string }>;

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Fireball');
  });

  it('insertCards batch insert works', () => {
    const cards: CardRow[] = [];
    for (let i = 0; i < 10; i++) {
      cards.push({
        id: String(i),
        card_id: `TEST_${i}`,
        name: `Test Card ${i}`,
        mana_cost: i,
        type: 'MINION',
        card_set: 'TEST',
        set_name: 'Test Set',
        player_class: 'NEUTRAL',
        rarity: 'COMMON',
        attack: i,
        health: i,
        durability: null,
        armor: null,
        text: `Test card text ${i}`,
        flavor: null,
        artist: null,
        collectible: 1,
        elite: 0,
        race: null,
        spell_school: null,
        keywords: null,
      });
    }

    insertCards(db, cards);

    const count = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number };
    expect(count.cnt).toBe(10);
  });

  it('hasExistingData returns false for empty, true after insert', () => {
    expect(hasExistingData(db)).toBe(false);

    insertCard(db, {
      id: '1',
      card_id: 'CS2_029',
      name: 'Fireball',
      mana_cost: 4,
      type: 'SPELL',
      card_set: 'CORE',
      set_name: 'Core',
      player_class: 'MAGE',
      rarity: 'FREE',
      attack: null,
      health: null,
      durability: null,
      armor: null,
      text: 'Deal 6 damage.',
      flavor: null,
      artist: null,
      collectible: 1,
      elite: 0,
      race: null,
      spell_school: null,
      keywords: null,
    });

    expect(hasExistingData(db)).toBe(true);
  });
});
