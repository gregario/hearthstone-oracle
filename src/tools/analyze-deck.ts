import type Database from 'better-sqlite3';
import { z } from 'zod';
import { decode } from 'deckstrings';
import type { CardRow } from '../data/db.js';
import { classifyArchetype, type ClassificationResult, type DeckProfile } from '../knowledge/archetype-classifier.js';

// --- Input Schema ---

export const AnalyzeDeckInput = z.object({
  deck_code: z.string().describe('Hearthstone deck code (base64 deckstring)'),
});

export type AnalyzeDeckInputType = z.infer<typeof AnalyzeDeckInput>;

// --- Result Types ---

export interface AnalyzeDeckSuccess {
  success: true;
  deck: {
    format: string;
    hero_class: string;
    cards: Array<{ name: string; mana_cost: number | null; count: number }>;
    total_cards: number;
    mana_curve: Record<string, number>;
    type_distribution: Record<string, number>;
  };
  classification: ClassificationResult;
  archetype_info?: {
    description: string;
    gameplan: string;
    strengths: string[];
    weaknesses: string[];
  };
  matchups?: Array<{
    vs_archetype: string;
    favoured: string;
    key_tension: string;
  }>;
}

export interface AnalyzeDeckError {
  success: false;
  message: string;
}

export type AnalyzeDeckResult = AnalyzeDeckSuccess | AnalyzeDeckError;

// --- Helpers ---

const HERO_CLASS_MAP: Record<number, string> = {
  7: 'WARRIOR',
  274: 'MAGE',
  31: 'HUNTER',
  637: 'PRIEST',
  930: 'ROGUE',
  1066: 'PALADIN',
  671: 'WARLOCK',
  813: 'SHAMAN',
  893: 'DRUID',
  56550: 'DEMON_HUNTER',
  78065: 'DEATH_KNIGHT',
};

function manaCurveBucket(cost: number | null): string {
  if (cost == null) return '0';
  if (cost >= 7) return '7+';
  return String(cost);
}

function parseJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// --- Handler ---

interface ArchetypeRow {
  name: string;
  description: string;
  gameplan: string;
  strengths: string;
  weaknesses: string;
}

interface MatchupRow {
  archetype_a: string;
  archetype_b: string;
  favoured: string;
  key_tension: string;
}

export function analyzeDeck(
  db: Database.Database,
  input: AnalyzeDeckInputType,
): AnalyzeDeckResult {
  // 1. Decode the deck
  let decoded: { cards: Array<[number, number]>; heroes: number[]; format: number };

  try {
    decoded = decode(input.deck_code);
  } catch (err) {
    return {
      success: false,
      message: `Invalid deck code: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 2. Format
  const format = decoded.format === 1 ? 'Wild' : 'Standard';

  // 3. Hero class
  let heroClass = 'UNKNOWN';
  if (decoded.heroes.length > 0) {
    const heroDbfId = decoded.heroes[0];
    const heroRow = db
      .prepare('SELECT player_class FROM cards WHERE id = ?')
      .get(String(heroDbfId)) as { player_class: string | null } | undefined;

    if (heroRow?.player_class) {
      heroClass = heroRow.player_class;
    } else if (HERO_CLASS_MAP[heroDbfId]) {
      heroClass = HERO_CLASS_MAP[heroDbfId];
    }
  }

  // 4. Build card list and profile data
  const deckCards: Array<{ name: string; mana_cost: number | null; count: number }> = [];
  const profileCards: DeckProfile['cards'] = [];
  const manaCurve: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  let totalCards = 0;
  let totalCost = 0;
  let cardsWithCost = 0;

  for (const [dbfId, count] of decoded.cards) {
    const row = db
      .prepare('SELECT * FROM cards WHERE id = ?')
      .get(String(dbfId)) as CardRow | undefined;

    const name = row ? row.name : `Unknown Card (${dbfId})`;
    const manaCost = row?.mana_cost ?? null;
    const type = row?.type ?? null;
    const text = row?.text ?? null;
    const keywords = row?.keywords ?? null;

    deckCards.push({ name, mana_cost: manaCost, count });

    // Add profile cards (expand by count for classification)
    for (let i = 0; i < count; i++) {
      profileCards.push({ mana_cost: manaCost, type, text, keywords });
    }

    totalCards += count;

    // Mana curve
    const bucket = manaCurveBucket(manaCost);
    manaCurve[bucket] = (manaCurve[bucket] ?? 0) + count;

    // Type distribution
    const cardType = type ?? 'UNKNOWN';
    typeDistribution[cardType] = (typeDistribution[cardType] ?? 0) + count;

    // Average cost tracking
    if (manaCost != null) {
      totalCost += manaCost * count;
      cardsWithCost += count;
    }
  }

  const avgCost = cardsWithCost > 0 ? totalCost / cardsWithCost : 0;

  // 5. Build DeckProfile and classify
  const profile: DeckProfile = {
    avg_cost: avgCost,
    cards: profileCards,
    total_cards: totalCards,
    mana_curve: manaCurve,
    type_distribution: typeDistribution,
  };

  const classification = classifyArchetype(profile);

  // 6. Look up archetype info from strategy tables
  let archetypeInfo: AnalyzeDeckSuccess['archetype_info'] | undefined;
  const archetypeRow = db
    .prepare('SELECT * FROM archetypes WHERE LOWER(name) = LOWER(?)')
    .get(classification.archetype) as ArchetypeRow | undefined;

  if (archetypeRow) {
    archetypeInfo = {
      description: archetypeRow.description,
      gameplan: archetypeRow.gameplan,
      strengths: parseJson(archetypeRow.strengths),
      weaknesses: parseJson(archetypeRow.weaknesses),
    };
  }

  // 7. Look up matchup expectations
  let matchups: AnalyzeDeckSuccess['matchups'] | undefined;
  const matchupRows = db
    .prepare(
      `SELECT archetype_a, archetype_b, favoured, key_tension FROM matchup_framework
       WHERE LOWER(archetype_a) = LOWER(?) OR LOWER(archetype_b) = LOWER(?)`,
    )
    .all(classification.archetype, classification.archetype) as MatchupRow[];

  if (matchupRows.length > 0) {
    matchups = matchupRows
      .filter((m) => m.archetype_a.toLowerCase() !== m.archetype_b.toLowerCase() ||
        m.archetype_a.toLowerCase() !== classification.archetype.toLowerCase())
      .map((m) => {
        const isA = m.archetype_a.toLowerCase() === classification.archetype.toLowerCase();
        return {
          vs_archetype: isA ? m.archetype_b : m.archetype_a,
          favoured: m.favoured,
          key_tension: m.key_tension,
        };
      });
  }

  return {
    success: true,
    deck: {
      format,
      hero_class: heroClass,
      cards: deckCards,
      total_cards: totalCards,
      mana_curve: manaCurve,
      type_distribution: typeDistribution,
    },
    classification,
    archetype_info: archetypeInfo,
    matchups: matchups && matchups.length > 0 ? matchups : undefined,
  };
}
