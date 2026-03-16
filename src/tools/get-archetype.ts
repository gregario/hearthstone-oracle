import type Database from 'better-sqlite3';
import { z } from 'zod';

// --- Input Schema ---

export const GetArchetypeInput = z.object({
  name: z.string().describe('Archetype name (e.g. "aggro", "control", "combo", "midrange", "tempo", "value")'),
});

export type GetArchetypeInputType = z.infer<typeof GetArchetypeInput>;

// --- Result Types ---

export interface ArchetypeInfo {
  name: string;
  description: string;
  gameplan: string;
  win_conditions: string[];
  strengths: string[];
  weaknesses: string[];
  example_decks: string[];
}

export type GetArchetypeResult =
  | { found: true; archetype: ArchetypeInfo }
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

interface ArchetypeRow {
  name: string;
  description: string;
  gameplan: string;
  win_conditions: string;
  strengths: string;
  weaknesses: string;
  example_decks: string | null;
}

export function getArchetype(
  db: Database.Database,
  input: GetArchetypeInputType,
): GetArchetypeResult {
  // 1. Exact match (case-insensitive)
  const row = db
    .prepare('SELECT * FROM archetypes WHERE LOWER(name) = LOWER(?)')
    .get(input.name) as ArchetypeRow | undefined;

  if (row) {
    return {
      found: true,
      archetype: {
        name: row.name,
        description: row.description,
        gameplan: row.gameplan,
        win_conditions: parseJson(row.win_conditions),
        strengths: parseJson(row.strengths),
        weaknesses: parseJson(row.weaknesses),
        example_decks: parseJson(row.example_decks),
      },
    };
  }

  // 2. Not found — suggest similar entries via LIKE
  const suggestions = db
    .prepare('SELECT name FROM archetypes WHERE LOWER(name) LIKE LOWER(?) LIMIT 5')
    .all(`%${input.name}%`) as Array<{ name: string }>;

  const suggestionNames = suggestions.map((s) => s.name);

  return {
    found: false,
    message: `No archetype found matching "${input.name}".`,
    suggestions: suggestionNames.length > 0 ? suggestionNames : undefined,
  };
}
