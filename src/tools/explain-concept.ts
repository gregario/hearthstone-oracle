import type Database from 'better-sqlite3';
import { z } from 'zod';

// --- Input Schema ---

export const ExplainConceptInput = z.object({
  name: z.string().describe('Game concept name (e.g. "tempo", "card advantage", "mana curve")'),
});

export type ExplainConceptInputType = z.infer<typeof ExplainConceptInput>;

// --- Result Types ---

export interface ConceptInfo {
  name: string;
  category: string;
  description: string;
  hearthstone_application: string;
}

export type ExplainConceptResult =
  | { found: true; concept: ConceptInfo }
  | { found: false; message: string; suggestions?: string[] };

// --- Handler ---

export function explainConcept(
  db: Database.Database,
  input: ExplainConceptInputType,
): ExplainConceptResult {
  // Exact match (case-insensitive)
  const row = db
    .prepare('SELECT * FROM game_concepts WHERE LOWER(name) = LOWER(?)')
    .get(input.name) as ConceptInfo | undefined;

  if (row) {
    return {
      found: true,
      concept: {
        name: row.name,
        category: row.category,
        description: row.description,
        hearthstone_application: row.hearthstone_application,
      },
    };
  }

  // Not found — suggest similar entries via LIKE
  const suggestions = db
    .prepare('SELECT name FROM game_concepts WHERE LOWER(name) LIKE LOWER(?) LIMIT 5')
    .all(`%${input.name}%`) as Array<{ name: string }>;

  const suggestionNames = suggestions.map((s) => s.name);

  return {
    found: false,
    message: `No game concept found matching "${input.name}".`,
    suggestions: suggestionNames.length > 0 ? suggestionNames : undefined,
  };
}
