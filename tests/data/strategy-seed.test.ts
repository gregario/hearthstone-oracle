import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase } from '../../src/data/db.js';
import { seedStrategyKnowledge } from '../../src/data/strategy-seed.js';
import type Database from 'better-sqlite3';

describe('strategy knowledge seeding', () => {
  let db: Database.Database;
  beforeEach(() => { db = getDatabase(':memory:'); });
  afterEach(() => { db.close(); });

  it('seeds at least 6 archetypes', () => {
    seedStrategyKnowledge(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM archetypes').get() as { count: number };
    expect(count.count).toBeGreaterThanOrEqual(6);
  });

  it('seeds all 11 class identities', () => {
    seedStrategyKnowledge(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM class_identities').get() as { count: number };
    expect(count.count).toBe(11);
  });

  it('seeds matchup framework entries', () => {
    seedStrategyKnowledge(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM matchup_framework').get() as { count: number };
    expect(count.count).toBeGreaterThanOrEqual(15);
  });

  it('seeds at least 7 game concepts', () => {
    seedStrategyKnowledge(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM game_concepts').get() as { count: number };
    expect(count.count).toBeGreaterThanOrEqual(7);
  });

  it('is idempotent — seeding twice does not duplicate', () => {
    seedStrategyKnowledge(db);
    seedStrategyKnowledge(db);
    const count = db.prepare('SELECT COUNT(*) as count FROM archetypes').get() as { count: number };
    expect(count.count).toBeGreaterThanOrEqual(6);
    // Should not have doubled
    expect(count.count).toBeLessThanOrEqual(10);
  });

  it('archetype data has all required fields', () => {
    seedStrategyKnowledge(db);
    const aggro = db.prepare('SELECT * FROM archetypes WHERE name = ?').get('aggro') as any;
    expect(aggro).toBeDefined();
    expect(aggro.description).toBeTruthy();
    expect(aggro.gameplan).toBeTruthy();
    expect(JSON.parse(aggro.win_conditions).length).toBeGreaterThan(0);
    expect(JSON.parse(aggro.strengths).length).toBeGreaterThan(0);
    expect(JSON.parse(aggro.weaknesses).length).toBeGreaterThan(0);
  });

  it('class identity data includes hero power', () => {
    seedStrategyKnowledge(db);
    const mage = db.prepare('SELECT * FROM class_identities WHERE class = ?').get('Mage') as any;
    expect(mage).toBeDefined();
    expect(mage.hero_power_name).toBe('Fireblast');
    expect(mage.hero_power_effect).toBeTruthy();
  });
});
