import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { CardRow } from '../data/db.js';
import type { CardDetail, GetCardResult } from '../format.js';

// --- Input Schema ---

export const GetCardInput = z.object({
  name: z.string().describe('Card name to look up (exact or partial match)'),
});

export type GetCardInputType = z.infer<typeof GetCardInput>;

// --- Helper: parse keywords JSON ---

function parseKeywords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// --- Helper: CardRow to CardDetail ---

function toCardDetail(row: CardRow): CardDetail {
  return {
    id: row.id,
    card_id: row.card_id,
    name: row.name,
    mana_cost: row.mana_cost,
    type: row.type,
    card_set: row.card_set,
    set_name: row.set_name,
    player_class: row.player_class,
    rarity: row.rarity,
    attack: row.attack,
    health: row.health,
    durability: row.durability,
    armor: row.armor,
    text: row.text,
    flavor: row.flavor,
    artist: row.artist,
    collectible: row.collectible,
    elite: row.elite,
    race: row.race,
    spell_school: row.spell_school,
    keywords: parseKeywords(row.keywords),
  };
}

// --- Handler ---

export function getCard(
  db: Database.Database,
  input: GetCardInputType,
): GetCardResult {
  // 1. Exact match (case-insensitive)
  const exact = db
    .prepare('SELECT * FROM cards WHERE LOWER(name) = LOWER(?)')
    .get(input.name) as CardRow | undefined;

  if (exact) {
    return { found: true, card: toCardDetail(exact) };
  }

  // 2. Fuzzy match via LIKE
  const fuzzy = db
    .prepare('SELECT * FROM cards WHERE LOWER(name) LIKE LOWER(?)')
    .get(`%${input.name}%`) as CardRow | undefined;

  if (fuzzy) {
    return { found: true, card: toCardDetail(fuzzy) };
  }

  // 3. Not found — provide suggestions based on first word
  const firstWord = input.name.split(/\s+/)[0];
  const suggestions = db
    .prepare('SELECT name FROM cards WHERE LOWER(name) LIKE LOWER(?) LIMIT 5')
    .all(`%${firstWord}%`) as Array<{ name: string }>;

  const suggestionNames = suggestions.map((s) => s.name);

  return {
    found: false,
    message: `No card found matching "${input.name}".`,
    suggestions: suggestionNames.length > 0 ? suggestionNames : undefined,
  };
}
