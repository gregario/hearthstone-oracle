import type Database from 'better-sqlite3';
import { z } from 'zod';

// --- Input Schema ---

export const GetClassIdentityInput = z.object({
  class_name: z
    .string()
    .optional()
    .describe('Class name (e.g. "Mage", "Warrior"). Omit to get an overview of all classes.'),
});

export type GetClassIdentityInputType = z.infer<typeof GetClassIdentityInput>;

// --- Result Types ---

export interface ClassIdentityInfo {
  class: string;
  identity: string;
  hero_power_name: string;
  hero_power_cost: number;
  hero_power_effect: string;
  hero_power_implications: string;
  historical_archetypes: string[];
  strengths: string[];
  weaknesses: string[];
  early_game: string;
  mid_game: string;
  late_game: string;
}

export interface ClassOverviewEntry {
  class: string;
  identity: string;
  hero_power_name: string;
}

export type GetClassIdentityResult =
  | { found: true; identity: ClassIdentityInfo }
  | { found: true; overview: true; classes: ClassOverviewEntry[] }
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

// --- Handler ---

interface ClassIdentityRow {
  class: string;
  identity: string;
  hero_power_name: string;
  hero_power_cost: number;
  hero_power_effect: string;
  hero_power_implications: string;
  historical_archetypes: string;
  strengths: string;
  weaknesses: string;
  early_game: string;
  mid_game: string;
  late_game: string;
}

function toClassIdentityInfo(row: ClassIdentityRow): ClassIdentityInfo {
  return {
    class: row.class,
    identity: row.identity,
    hero_power_name: row.hero_power_name,
    hero_power_cost: row.hero_power_cost,
    hero_power_effect: row.hero_power_effect,
    hero_power_implications: row.hero_power_implications,
    historical_archetypes: parseJson(row.historical_archetypes),
    strengths: parseJson(row.strengths),
    weaknesses: parseJson(row.weaknesses),
    early_game: row.early_game,
    mid_game: row.mid_game,
    late_game: row.late_game,
  };
}

export function getClassIdentity(
  db: Database.Database,
  input: GetClassIdentityInputType,
): GetClassIdentityResult {
  // If no class_name provided, return overview of all classes
  if (!input.class_name) {
    const rows = db
      .prepare('SELECT class, identity, hero_power_name FROM class_identities ORDER BY class')
      .all() as ClassOverviewEntry[];

    return {
      found: true,
      overview: true,
      classes: rows,
    };
  }

  // Single class lookup (case-insensitive)
  const row = db
    .prepare('SELECT * FROM class_identities WHERE LOWER(class) = LOWER(?)')
    .get(input.class_name) as ClassIdentityRow | undefined;

  if (row) {
    return {
      found: true,
      identity: toClassIdentityInfo(row),
    };
  }

  // Not found — suggest similar entries via LIKE
  const suggestions = db
    .prepare('SELECT class FROM class_identities WHERE LOWER(class) LIKE LOWER(?) LIMIT 5')
    .all(`%${input.class_name}%`) as Array<{ class: string }>;

  const suggestionNames = suggestions.map((s) => s.class);

  return {
    found: false,
    message: `No class found matching "${input.class_name}".`,
    suggestions: suggestionNames.length > 0 ? suggestionNames : undefined,
  };
}
