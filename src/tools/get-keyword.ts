import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { CardRow } from '../data/db.js';
import type { CardSummary } from '../format.js';

// --- Input Schema ---

export const GetKeywordInput = z.object({
  name: z.string().describe('Keyword name (e.g. "Deathrattle", "Battlecry")'),
  player_class: z
    .string()
    .optional()
    .describe('Filter related cards by class (e.g. MAGE, WARRIOR)'),
});

export type GetKeywordInputType = z.infer<typeof GetKeywordInput>;

// --- Result Types ---

export interface KeywordInfo {
  name: string;
  description: string;
  related_keywords: string[];
}

export type GetKeywordResult =
  | { found: true; keyword: KeywordInfo; cards: CardSummary[] }
  | { found: false; message: string; suggestions?: string[] };

// --- Helpers ---

function parseJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function toCardSummary(row: CardRow): CardSummary {
  return {
    name: row.name,
    mana_cost: row.mana_cost,
    type: row.type,
    player_class: row.player_class,
    rarity: row.rarity,
    text: row.text ? row.text.split('\n')[0] : null,
    attack: row.attack,
    health: row.health,
    keywords: parseJson(row.keywords),
  };
}

// --- Handler ---

export function getKeyword(
  db: Database.Database,
  input: GetKeywordInputType,
): GetKeywordResult {
  // 1. Look up keyword in keywords table (case-insensitive)
  const keywordRow = db
    .prepare('SELECT * FROM keywords WHERE LOWER(name) = LOWER(?)')
    .get(input.name) as { name: string; description: string; related_keywords: string | null } | undefined;

  // 2. Find cards that have this keyword in their keywords JSON
  // The keywords JSON stores mechanics like "BATTLECRY", "TAUNT", etc.
  // We search case-insensitively by upper-casing the keyword and replacing spaces with underscores
  const mechanicName = input.name.toUpperCase().replace(/\s+/g, '_');

  let cardSql = `SELECT * FROM cards WHERE keywords LIKE ? AND collectible = 1`;
  const cardParams: unknown[] = [`%${mechanicName}%`];

  if (input.player_class) {
    cardSql += ' AND UPPER(player_class) = UPPER(?)';
    cardParams.push(input.player_class);
  }

  cardSql += ' ORDER BY name LIMIT 25';

  const cardRows = db.prepare(cardSql).all(...cardParams) as CardRow[];
  const cards = cardRows.map(toCardSummary);

  // 3. If keyword found in table, return it with cards
  if (keywordRow) {
    return {
      found: true,
      keyword: {
        name: keywordRow.name,
        description: keywordRow.description,
        related_keywords: parseJson(keywordRow.related_keywords),
      },
      cards,
    };
  }

  // 4. If keyword not in table but we found cards with it, still return found
  if (cards.length > 0) {
    return {
      found: true,
      keyword: {
        name: input.name,
        description: `Cards with the ${input.name} mechanic.`,
        related_keywords: [],
      },
      cards,
    };
  }

  // 5. Not found — provide suggestions via LIKE match on partial name
  const suggestions = db
    .prepare('SELECT name FROM keywords WHERE LOWER(name) LIKE LOWER(?) LIMIT 5')
    .all(`%${input.name}%`) as Array<{ name: string }>;

  const suggestionNames = suggestions.map((s) => s.name);

  return {
    found: false,
    message: `No keyword found matching "${input.name}".`,
    suggestions: suggestionNames.length > 0 ? suggestionNames : undefined,
  };
}
