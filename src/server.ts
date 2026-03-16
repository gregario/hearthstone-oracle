#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'node:module';
import type Database from 'better-sqlite3';

import { SearchCardsInput, searchCards } from './tools/search-cards.js';
import { GetCardInput, getCard } from './tools/get-card.js';
import { GetKeywordInput, getKeyword } from './tools/get-keyword.js';
import { DecodeDeckInput, decodeDeck } from './tools/decode-deck.js';
import { AnalyzeDeckInput, analyzeDeck } from './tools/analyze-deck.js';
import { GetArchetypeInput, getArchetype } from './tools/get-archetype.js';
import {
  GetClassIdentityInput,
  getClassIdentity,
} from './tools/get-class-identity.js';
import { GetMatchupInput, getMatchup } from './tools/get-matchup.js';
import {
  ExplainConceptInput,
  explainConcept,
} from './tools/explain-concept.js';

import {
  formatSearchCards,
  formatGetCard,
  formatGetKeyword,
  formatDecodeDeck,
  formatAnalyzeDeck,
  formatGetArchetype,
  formatGetClassIdentity,
  formatGetMatchup,
  formatExplainConcept,
} from './format.js';

import { getDatabase } from './data/db.js';
import { runPipeline } from './data/pipeline.js';
import { seedStrategyKnowledge } from './data/strategy-seed.js';

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

export function createServer(db: Database.Database) {
  const server = new McpServer(
    { name: 'hearthstone-oracle', version: getVersion() },
    { capabilities: { tools: {} } },
  );

  // 1. search_cards
  server.tool(
    'search_cards',
    'Search for Hearthstone cards by name, text, class, mana cost, type, rarity, set, or keyword. Use this when you need to find cards matching specific criteria. Returns a summary list — use get_card for full details on a specific card.',
    SearchCardsInput.shape,
    async (params) => {
      try {
        const result = searchCards(db, params);
        return {
          content: [
            { type: 'text' as const, text: formatSearchCards(result) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 2. get_card
  server.tool(
    'get_card',
    'Get complete details for a specific Hearthstone card including stats, text, keywords, and type. Use this when you know the card name (or close to it) and need full information. Supports fuzzy matching.',
    GetCardInput.shape,
    async (params) => {
      try {
        const result = getCard(db, params);
        return {
          content: [
            { type: 'text' as const, text: formatGetCard(result) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 3. get_keyword
  server.tool(
    'get_keyword',
    'Look up a Hearthstone keyword or mechanic (e.g., Battlecry, Deathrattle, Discover) and see all cards that have it. Use this to explain what a keyword does or find all cards with a specific mechanic.',
    GetKeywordInput.shape,
    async (params) => {
      try {
        const result = getKeyword(db, params);
        return {
          content: [
            { type: 'text' as const, text: formatGetKeyword(result) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 4. decode_deck
  server.tool(
    'decode_deck',
    'Decode a Hearthstone deck code into its full card list with mana curve and card type breakdown. Use this when a user shares a deck code and wants to see what\'s in it.',
    DecodeDeckInput.shape,
    async (params) => {
      try {
        const result = decodeDeck(db, params);
        return {
          content: [
            { type: 'text' as const, text: formatDecodeDeck(result) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 5. analyze_deck
  server.tool(
    'analyze_deck',
    'Analyze a Hearthstone deck code to classify its archetype, explain its gameplan, identify strengths and weaknesses, and predict matchup dynamics. Use this for strategic deck coaching — it combines card data with strategy knowledge.',
    AnalyzeDeckInput.shape,
    async (params) => {
      try {
        const result = analyzeDeck(db, params);
        return {
          content: [
            { type: 'text' as const, text: formatAnalyzeDeck(result) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 6. get_archetype
  server.tool(
    'get_archetype',
    'Get a detailed explanation of a Hearthstone deck archetype (aggro, control, combo, midrange, tempo, value). Includes gameplan, win conditions, strengths, weaknesses, and example decks. Use this when explaining deck building strategy.',
    GetArchetypeInput.shape,
    async (params) => {
      try {
        const result = getArchetype(db, params);
        return {
          content: [
            { type: 'text' as const, text: formatGetArchetype(result) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 7. get_class_identity
  server.tool(
    'get_class_identity',
    'Get the strategic identity of a Hearthstone class — hero power implications, historical archetypes, strengths, weaknesses, and how the class approaches each game phase. Omit the class name to get an overview of all 11 classes.',
    GetClassIdentityInput.shape,
    async (params) => {
      try {
        const result = getClassIdentity(db, params);
        return {
          content: [
            {
              type: 'text' as const,
              text: formatGetClassIdentity(result),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 8. get_matchup
  server.tool(
    'get_matchup',
    'Get the theoretical matchup dynamics between two Hearthstone archetypes. Explains who is favoured, why, the key strategic tension, and what each side should prioritise.',
    GetMatchupInput.shape,
    async (params) => {
      try {
        const result = getMatchup(db, params);
        return {
          content: [
            { type: 'text' as const, text: formatGetMatchup(result) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // 9. explain_concept
  server.tool(
    'explain_concept',
    'Explain a fundamental Hearthstone game concept like card advantage, tempo, value, board control, or mana curve. Includes how the concept applies specifically to Hearthstone.',
    ExplainConceptInput.shape,
    async (params) => {
      try {
        const result = explainConcept(db, params);
        return {
          content: [
            {
              type: 'text' as const,
              text: formatExplainConcept(result),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const version = getVersion();
  const db = getDatabase();

  // Run data pipeline
  try {
    console.error('[hearthstone-oracle] Starting data pipeline...');
    const cardCount = await runPipeline(db);
    console.error(
      `[hearthstone-oracle] Pipeline: ok (${cardCount} cards)`,
    );
  } catch (err) {
    console.error(
      `[hearthstone-oracle] Pipeline error: ${err instanceof Error ? err.message : String(err)}`,
    );
    console.error(
      '[hearthstone-oracle] Continuing with existing data (if any)...',
    );
  }

  // Seed strategy knowledge
  seedStrategyKnowledge(db);

  const server = createServer(db);
  const transport = new StdioServerTransport();
  console.error(`[hearthstone-oracle] v${version} starting on stdio...`);
  await server.connect(transport);
  console.error('[hearthstone-oracle] Server running — 9 tools registered');

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(
    `[hearthstone-oracle] Fatal: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
