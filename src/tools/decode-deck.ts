import type Database from 'better-sqlite3';
import { z } from 'zod';
import { decode } from 'deckstrings';
import type { CardRow } from '../data/db.js';
import type { CardSummary } from '../format.js';

// --- Input Schema ---

export const DecodeDeckInput = z.object({
  deck_code: z.string().describe('Hearthstone deck code (base64 deckstring)'),
});

export type DecodeDeckInputType = z.infer<typeof DecodeDeckInput>;

// --- Result Types ---

export interface DecodeDeckSuccess {
  success: true;
  format: string;
  hero_class: string;
  cards: Array<{ card: CardSummary; count: number }>;
  total_cards: number;
  mana_curve: Record<string, number>;
  type_distribution: Record<string, number>;
}

export interface DecodeDeckError {
  success: false;
  message: string;
}

export type DecodeDeckResult = DecodeDeckSuccess | DecodeDeckError;

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

function manaCurveBucket(cost: number | null): string {
  if (cost == null) return '0';
  if (cost >= 7) return '7+';
  return String(cost);
}

// --- Hero dbfId to class mapping (common heroes) ---

const HERO_CLASS_MAP: Record<number, string> = {
  7: 'WARRIOR',     // Garrosh Hellscream
  274: 'MAGE',      // Jaina Proudmoore
  31: 'HUNTER',     // Rexxar
  637: 'PRIEST',    // Anduin Wrynn
  930: 'ROGUE',     // Valeera Sanguinar
  1066: 'PALADIN',  // Uther Lightbringer
  671: 'WARLOCK',   // Gul'dan
  813: 'SHAMAN',    // Thrall
  893: 'DRUID',     // Malfurion Stormrage
  56550: 'DEMON_HUNTER', // Illidan Stormrage
  78065: 'DEATH_KNIGHT', // The Lich King
};

// --- Handler ---

export function decodeDeck(
  db: Database.Database,
  input: DecodeDeckInputType,
): DecodeDeckResult {
  let decoded: { cards: Array<[number, number]>; heroes: number[]; format: number };

  try {
    decoded = decode(input.deck_code);
  } catch (err) {
    return {
      success: false,
      message: `Invalid deck code: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Format
  const format = decoded.format === 1 ? 'Wild' : 'Standard';

  // Hero class — try to look up hero in DB first, then fall back to map
  let heroClass = 'UNKNOWN';
  if (decoded.heroes.length > 0) {
    const heroDbfId = decoded.heroes[0];
    // Try DB lookup
    const heroRow = db
      .prepare('SELECT player_class FROM cards WHERE id = ?')
      .get(String(heroDbfId)) as { player_class: string | null } | undefined;

    if (heroRow?.player_class) {
      heroClass = heroRow.player_class;
    } else if (HERO_CLASS_MAP[heroDbfId]) {
      heroClass = HERO_CLASS_MAP[heroDbfId];
    }
  }

  // Cards
  const cards: Array<{ card: CardSummary; count: number }> = [];
  const manaCurve: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  let totalCards = 0;

  for (const [dbfId, count] of decoded.cards) {
    const row = db
      .prepare('SELECT * FROM cards WHERE id = ?')
      .get(String(dbfId)) as CardRow | undefined;

    let cardSummary: CardSummary;
    if (row) {
      cardSummary = toCardSummary(row);
    } else {
      // Unknown card — create a richer placeholder so the user understands
      // what happened and how to resolve it. The most common cause is a
      // recently-released card whose dbfId isn't in the local snapshot yet.
      cardSummary = {
        name: `Unknown card (dbfId: ${dbfId}) — possibly added in a recent expansion; refresh data to resolve`,
        mana_cost: null,
        type: null,
        player_class: null,
        rarity: null,
        text: null,
        attack: null,
        health: null,
        keywords: [],
      };
    }

    cards.push({ card: cardSummary, count });
    totalCards += count;

    // Mana curve
    const bucket = manaCurveBucket(cardSummary.mana_cost);
    manaCurve[bucket] = (manaCurve[bucket] ?? 0) + count;

    // Type distribution
    const cardType = cardSummary.type ?? 'UNKNOWN';
    typeDistribution[cardType] = (typeDistribution[cardType] ?? 0) + count;
  }

  return {
    success: true,
    format,
    hero_class: heroClass,
    cards,
    total_cards: totalCards,
    mana_curve: manaCurve,
    type_distribution: typeDistribution,
  };
}
