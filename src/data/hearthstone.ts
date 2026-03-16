import type Database from 'better-sqlite3';
import { insertCards, type CardRow } from './db.js';

// --- Types ---

export interface HearthstoneCard {
  id: string;
  dbfId: number;
  name: string;
  cost: number;
  type: string;
  set: string;
  rarity: string;
  attack?: number;
  health?: number;
  durability?: number;
  armor?: number;
  cardClass?: string;
  text?: string;
  flavor?: string;
  artist?: string;
  collectible?: boolean;
  elite?: boolean;
  mechanics?: string[];
  race?: string;
  spellSchool?: string;
}

// --- Constants ---

const HEARTHSTONE_JSON_URL =
  'https://api.hearthstonejson.com/v1/latest/enUS/cards.json';

// --- Transform ---

/**
 * Transform a HearthstoneJSON card into our CardRow schema.
 */
export function transformCard(card: HearthstoneCard): CardRow {
  return {
    id: String(card.dbfId),
    card_id: card.id,
    name: card.name,
    mana_cost: card.cost ?? null,
    type: card.type ?? null,
    card_set: card.set ?? null,
    set_name: null,
    player_class: card.cardClass ?? 'NEUTRAL',
    rarity: card.rarity ?? null,
    attack: card.attack ?? null,
    health: card.health ?? null,
    durability: card.durability ?? null,
    armor: card.armor ?? null,
    text: card.text ?? null,
    flavor: card.flavor ?? null,
    artist: card.artist ?? null,
    collectible: card.collectible ? 1 : 0,
    elite: card.elite ? 1 : 0,
    race: card.race ?? null,
    spell_school: card.spellSchool ?? null,
    keywords: card.mechanics?.length ? JSON.stringify(card.mechanics) : null,
  };
}

// --- Ingestion ---

/**
 * Transform and batch-insert HearthstoneJSON cards into the database.
 */
export function ingestCards(
  db: Database.Database,
  cards: HearthstoneCard[]
): void {
  const rows = cards.map(transformCard);
  insertCards(db, rows);
}

// --- Fetch ---

/**
 * Fetch cards from HearthstoneJSON.
 *
 * @param fetchFn - Optional fetch implementation (for testing/DI).
 *                  Defaults to global fetch.
 */
export async function fetchCards(
  fetchFn: typeof fetch = fetch
): Promise<HearthstoneCard[]> {
  console.error(`Fetching cards from ${HEARTHSTONE_JSON_URL}...`);
  const response = await fetchFn(HEARTHSTONE_JSON_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch cards: ${response.status} ${response.statusText}`
    );
  }

  const cards = (await response.json()) as HearthstoneCard[];
  console.error(`Fetched ${cards.length} cards from HearthstoneJSON`);
  return cards;
}
