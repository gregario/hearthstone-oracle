import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { CardRow } from '../data/db.js';
import type { CardSummary, SearchCardsResult } from '../format.js';

// --- Input Schema ---

export const SearchCardsInput = z.object({
  query: z
    .string()
    .optional()
    .describe('Free-text search across card name and text (uses FTS5)'),
  player_class: z
    .string()
    .optional()
    .describe('Filter by class (e.g. MAGE, WARRIOR, NEUTRAL)'),
  mana_cost: z
    .number()
    .optional()
    .describe('Filter by mana cost (combine with cost_op for range queries)'),
  cost_op: z
    .enum(['eq', 'lt', 'lte', 'gt', 'gte'])
    .optional()
    .default('eq')
    .describe('Cost comparison operator: eq, lt, lte, gt, gte (default: eq)'),
  type: z
    .string()
    .optional()
    .describe('Filter by card type: MINION, SPELL, WEAPON, HERO, LOCATION'),
  rarity: z
    .string()
    .optional()
    .describe('Filter by rarity: FREE, COMMON, RARE, EPIC, LEGENDARY'),
  card_set: z
    .string()
    .optional()
    .describe('Filter by set code (e.g. CORE, CLASSIC, LOE)'),
  keyword: z
    .string()
    .optional()
    .describe('Filter by keyword in keywords JSON (e.g. BATTLECRY, TAUNT, CHARGE)'),
  race: z
    .string()
    .optional()
    .describe('Filter by minion race/tribe (e.g. BEAST, DRAGON, MURLOC)'),
  collectible_only: z
    .boolean()
    .optional()
    .default(true)
    .describe('Only return collectible cards (default: true)'),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(25)
    .describe('Max results to return, 1-50 (default: 25)'),
});

export type SearchCardsInputType = z.infer<typeof SearchCardsInput>;

// --- Cost operator mapping ---

const COST_OPS: Record<string, string> = {
  eq: '=',
  lt: '<',
  lte: '<=',
  gt: '>',
  gte: '>=',
};

// --- Helper: parse keywords JSON ---

function parseKeywords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// --- Helper: first line preview ---

function textPreview(text: string | null): string | null {
  if (!text) return null;
  return text.split('\n')[0];
}

// --- Handler ---

export function searchCards(
  db: Database.Database,
  input: SearchCardsInputType,
): SearchCardsResult {
  const params: unknown[] = [];
  const conditions: string[] = [];
  const useFts = !!input.query;

  // Collectible filter
  if (input.collectible_only !== false) {
    conditions.push('c.collectible = 1');
  }

  // Class filter
  if (input.player_class) {
    conditions.push('UPPER(c.player_class) = UPPER(?)');
    params.push(input.player_class);
  }

  // Cost filter
  if (input.mana_cost != null) {
    const op = COST_OPS[input.cost_op ?? 'eq'] ?? '=';
    conditions.push(`c.mana_cost ${op} ?`);
    params.push(input.mana_cost);
  }

  // Type filter
  if (input.type) {
    conditions.push('UPPER(c.type) = UPPER(?)');
    params.push(input.type);
  }

  // Rarity filter
  if (input.rarity) {
    conditions.push('UPPER(c.rarity) = UPPER(?)');
    params.push(input.rarity);
  }

  // Set filter
  if (input.card_set) {
    conditions.push('UPPER(c.card_set) = UPPER(?)');
    params.push(input.card_set);
  }

  // Keyword filter (search in JSON string)
  if (input.keyword) {
    conditions.push("c.keywords LIKE '%' || ? || '%'");
    params.push(input.keyword);
  }

  // Race filter
  if (input.race) {
    conditions.push('UPPER(c.race) = UPPER(?)');
    params.push(input.race);
  }

  const limit = input.limit ?? 25;

  let sql: string;
  const allParams: unknown[] = [];

  if (useFts) {
    // FTS5 query
    allParams.push(input.query);
    allParams.push(...params);
    allParams.push(limit);

    const whereClause =
      conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';

    sql = `
      SELECT c.* FROM cards_fts fts
      JOIN cards c ON c.rowid = fts.rowid
      WHERE cards_fts MATCH ?${whereClause}
      ORDER BY fts.rank
      LIMIT ?
    `;
  } else {
    // Regular query
    allParams.push(...params);
    allParams.push(limit);

    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    sql = `
      SELECT c.* FROM cards c
      ${whereClause}
      ORDER BY c.name
      LIMIT ?
    `;
  }

  const rows = db.prepare(sql).all(...allParams) as CardRow[];

  const cards: CardSummary[] = rows.map((row) => ({
    name: row.name,
    mana_cost: row.mana_cost,
    type: row.type,
    player_class: row.player_class,
    rarity: row.rarity,
    text: textPreview(row.text),
    attack: row.attack,
    health: row.health,
    keywords: parseKeywords(row.keywords),
  }));

  return { cards, total: cards.length };
}
