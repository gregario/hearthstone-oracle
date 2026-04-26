import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { getDatabase, type CardRow } from '../../src/data/db.js';
import {
  transformCard,
  ingestCards,
  type HearthstoneCard,
} from '../../src/data/hearthstone.js';

// --- Fixtures ---

const RENO_JACKSON: HearthstoneCard = {
  id: 'LOE_011',
  dbfId: 2883,
  name: 'Reno Jackson',
  cost: 6,
  attack: 4,
  health: 6,
  type: 'MINION',
  cardClass: 'NEUTRAL',
  set: 'LOE',
  rarity: 'LEGENDARY',
  text: 'Battlecry: If your deck has no duplicates, fully heal your hero.',
  flavor: 'Some flavor',
  artist: 'Tooth',
  collectible: true,
  elite: true,
  mechanics: ['BATTLECRY'],
};

const FIREBALL: HearthstoneCard = {
  id: 'CS2_029',
  dbfId: 315,
  name: 'Fireball',
  cost: 4,
  type: 'SPELL',
  cardClass: 'MAGE',
  set: 'CORE',
  rarity: 'FREE',
  text: 'Deal 6 damage.',
  collectible: true,
  elite: false,
  mechanics: [],
  spellSchool: 'FIRE',
};

describe('transformCard', () => {
  it('correctly maps all fields for a minion', () => {
    const row = transformCard(RENO_JACKSON);

    expect(row.id).toBe('2883');
    expect(row.card_id).toBe('LOE_011');
    expect(row.name).toBe('Reno Jackson');
    expect(row.mana_cost).toBe(6);
    expect(row.attack).toBe(4);
    expect(row.health).toBe(6);
    expect(row.type).toBe('MINION');
    expect(row.player_class).toBe('NEUTRAL');
    expect(row.card_set).toBe('LOE');
    expect(row.rarity).toBe('LEGENDARY');
    expect(row.text).toBe(
      'Battlecry: If your deck has no duplicates, fully heal your hero.'
    );
    expect(row.flavor).toBe('Some flavor');
    expect(row.artist).toBe('Tooth');
    expect(row.collectible).toBe(1);
    expect(row.elite).toBe(1);
    expect(row.keywords).toBe('["BATTLECRY"]');
    expect(row.durability).toBeNull();
    expect(row.armor).toBeNull();
    expect(row.race).toBeNull();
    expect(row.spell_school).toBeNull();
    expect(row.set_name).toBeNull();
  });

  it('handles spell with spellSchool', () => {
    const row = transformCard(FIREBALL);

    expect(row.id).toBe('315');
    expect(row.card_id).toBe('CS2_029');
    expect(row.name).toBe('Fireball');
    expect(row.mana_cost).toBe(4);
    expect(row.type).toBe('SPELL');
    expect(row.player_class).toBe('MAGE');
    expect(row.spell_school).toBe('FIRE');
    expect(row.attack).toBeNull();
    expect(row.health).toBeNull();
    expect(row.collectible).toBe(1);
    expect(row.elite).toBe(0);
    // Empty mechanics array → null
    expect(row.keywords).toBeNull();
  });

  it('handles missing optional fields', () => {
    const minimal: HearthstoneCard = {
      id: 'UNKNOWN_001',
      dbfId: 99999,
      name: 'Mystery Spell',
      cost: 3,
      type: 'SPELL',
      set: 'TEST',
      rarity: 'COMMON',
    };

    const row = transformCard(minimal);

    expect(row.id).toBe('99999');
    expect(row.card_id).toBe('UNKNOWN_001');
    expect(row.name).toBe('Mystery Spell');
    expect(row.mana_cost).toBe(3);
    expect(row.player_class).toBe('NEUTRAL');
    expect(row.attack).toBeNull();
    expect(row.health).toBeNull();
    expect(row.durability).toBeNull();
    expect(row.armor).toBeNull();
    expect(row.text).toBeNull();
    expect(row.flavor).toBeNull();
    expect(row.artist).toBeNull();
    expect(row.collectible).toBe(0);
    expect(row.elite).toBe(0);
    expect(row.race).toBeNull();
    expect(row.spell_school).toBeNull();
    expect(row.keywords).toBeNull();
  });
});

describe('ingestCards', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('inserts cards into database', () => {
    ingestCards(db, [RENO_JACKSON, FIREBALL]);

    const count = db
      .prepare('SELECT COUNT(*) as cnt FROM cards')
      .get() as { cnt: number };
    expect(count.cnt).toBe(2);

    const reno = db
      .prepare('SELECT * FROM cards WHERE id = ?')
      .get('2883') as CardRow;
    expect(reno.name).toBe('Reno Jackson');
    expect(reno.mana_cost).toBe(6);

    const fireball = db
      .prepare('SELECT * FROM cards WHERE id = ?')
      .get('315') as CardRow;
    expect(fireball.name).toBe('Fireball');
    expect(fireball.spell_school).toBe('FIRE');
  });

  it('cards are searchable via FTS5 after ingestion', () => {
    ingestCards(db, [RENO_JACKSON, FIREBALL]);

    const results = db
      .prepare(
        'SELECT name FROM cards_fts WHERE cards_fts MATCH ? ORDER BY rank'
      )
      .all('Reno') as Array<{ name: string }>;

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Reno Jackson');

    // Search by card text
    const damageResults = db
      .prepare(
        'SELECT name FROM cards_fts WHERE cards_fts MATCH ? ORDER BY rank'
      )
      .all('damage') as Array<{ name: string }>;

    expect(damageResults.length).toBe(1);
    expect(damageResults[0].name).toBe('Fireball');
  });

  it('re-ingestion does not create duplicates (INSERT OR REPLACE)', () => {
    ingestCards(db, [RENO_JACKSON, FIREBALL]);
    ingestCards(db, [RENO_JACKSON, FIREBALL]);

    const count = db
      .prepare('SELECT COUNT(*) as cnt FROM cards')
      .get() as { cnt: number };
    expect(count.cnt).toBe(2);
  });
});
