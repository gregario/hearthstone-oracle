import type Database from 'better-sqlite3';
import { getDatabase } from '../src/data/db.js';
import { ingestCards, type HearthstoneCard } from '../src/data/hearthstone.js';
import { seedStrategyKnowledge } from '../src/data/strategy-seed.js';

// --- Card Fixtures ---

export const RENO_JACKSON: HearthstoneCard = {
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
  collectible: true,
  elite: true,
  mechanics: ['BATTLECRY'],
};

export const FIREBALL: HearthstoneCard = {
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
  mechanics: [],
  spellSchool: 'FIRE',
};

export const FIERY_WAR_AXE: HearthstoneCard = {
  id: 'CS2_106',
  dbfId: 401,
  name: 'Fiery War Axe',
  cost: 3,
  attack: 3,
  durability: 2,
  type: 'WEAPON',
  cardClass: 'WARRIOR',
  set: 'CORE',
  rarity: 'FREE',
  text: undefined,
  collectible: true,
  mechanics: [],
};

export const TIRION: HearthstoneCard = {
  id: 'EX1_383',
  dbfId: 890,
  name: 'Tirion Fordring',
  cost: 8,
  attack: 6,
  health: 6,
  type: 'MINION',
  cardClass: 'PALADIN',
  set: 'CLASSIC',
  rarity: 'LEGENDARY',
  text: 'Divine Shield, Taunt. Deathrattle: Equip a 5/3 Ashbringer.',
  collectible: true,
  elite: true,
  mechanics: ['DIVINE_SHIELD', 'TAUNT', 'DEATHRATTLE'],
};

export const STONETUSK_BOAR: HearthstoneCard = {
  id: 'CS2_171',
  dbfId: 648,
  name: 'Stonetusk Boar',
  cost: 1,
  attack: 1,
  health: 1,
  type: 'MINION',
  cardClass: 'NEUTRAL',
  set: 'CORE',
  rarity: 'FREE',
  text: 'Charge',
  collectible: true,
  mechanics: ['CHARGE'],
  race: 'BEAST',
};

export function createTestDb(): Database.Database {
  const db = getDatabase(':memory:');
  ingestCards(db, [RENO_JACKSON, FIREBALL, FIERY_WAR_AXE, TIRION, STONETUSK_BOAR]);
  seedStrategyKnowledge(db);
  return db;
}
