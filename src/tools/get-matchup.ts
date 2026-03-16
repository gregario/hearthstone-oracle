import type Database from 'better-sqlite3';
import { z } from 'zod';

// --- Input Schema ---

export const GetMatchupInput = z.object({
  archetype_a: z.string().describe('First archetype name (e.g. "aggro", "control")'),
  archetype_b: z.string().describe('Second archetype name (e.g. "combo", "midrange")'),
});

export type GetMatchupInputType = z.infer<typeof GetMatchupInput>;

// --- Result Types ---

export interface MatchupInfo {
  archetype_a: string;
  archetype_b: string;
  favoured: string;
  reasoning: string;
  key_tension: string;
  archetype_a_priority: string;
  archetype_b_priority: string;
}

export type GetMatchupResult =
  | { found: true; matchup: MatchupInfo }
  | { found: false; message: string; suggestions?: string[] };

// --- Handler ---

export function getMatchup(
  db: Database.Database,
  input: GetMatchupInputType,
): GetMatchupResult {
  // Check both orderings since the table stores one direction
  const row = db
    .prepare(
      `SELECT * FROM matchup_framework WHERE
        (LOWER(archetype_a) = LOWER(?) AND LOWER(archetype_b) = LOWER(?))
        OR
        (LOWER(archetype_a) = LOWER(?) AND LOWER(archetype_b) = LOWER(?))`,
    )
    .get(input.archetype_a, input.archetype_b, input.archetype_b, input.archetype_a) as MatchupInfo | undefined;

  if (row) {
    return {
      found: true,
      matchup: {
        archetype_a: row.archetype_a,
        archetype_b: row.archetype_b,
        favoured: row.favoured,
        reasoning: row.reasoning,
        key_tension: row.key_tension,
        archetype_a_priority: row.archetype_a_priority,
        archetype_b_priority: row.archetype_b_priority,
      },
    };
  }

  // Not found — suggest available archetypes
  const archetypes = db
    .prepare('SELECT DISTINCT archetype_a FROM matchup_framework UNION SELECT DISTINCT archetype_b FROM matchup_framework')
    .all() as Array<{ archetype_a: string }>;

  const availableNames = archetypes.map((a) => a.archetype_a);

  return {
    found: false,
    message: `No matchup found for "${input.archetype_a}" vs "${input.archetype_b}".`,
    suggestions: availableNames.length > 0 ? availableNames : undefined,
  };
}
