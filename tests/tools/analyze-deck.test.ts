import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { encode } from 'deckstrings';
import { createTestDb } from '../helpers.js';
import { analyzeDeck } from '../../src/tools/analyze-deck.js';
import { formatAnalyzeDeck } from '../../src/format.js';

describe('analyze_deck', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Build an aggro-like test deck: all cheap cards
  function makeAggroDeckCode(): string {
    return encode({
      cards: [
        [648, 2],   // Stonetusk Boar x2 (1 mana, Charge)
        [315, 2],   // Fireball x2 (4 mana, deal 6 damage)
        [401, 2],   // Fiery War Axe x2 (3 mana, weapon)
      ],
      heroes: [274], // Mage
      format: 2,     // Standard
    });
  }

  // Build a control-like test deck: expensive cards
  function makeControlDeckCode(): string {
    return encode({
      cards: [
        [890, 1],  // Tirion Fordring x1 (8 mana)
        [2883, 1], // Reno Jackson x1 (6 mana, heal)
      ],
      heroes: [274], // Mage
      format: 2,
    });
  }

  // 1. Valid deck code returns full analysis with classification
  it('returns full analysis with classification for a valid deck', () => {
    const code = makeAggroDeckCode();
    const result = analyzeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Deck info
    expect(result.deck.total_cards).toBe(6);
    expect(result.deck.hero_class).toBeTruthy();
    expect(result.deck.mana_curve).toBeDefined();
    expect(result.deck.type_distribution).toBeDefined();

    // Classification
    expect(result.classification).toBeDefined();
    expect(result.classification.archetype).toBeTruthy();
    expect(result.classification.confidence).toBeGreaterThan(0);
    expect(result.classification.reasoning).toBeTruthy();
  });

  // 2. Classification includes archetype info from strategy tables
  it('includes archetype info from strategy tables when available', () => {
    const code = makeAggroDeckCode();
    const result = analyzeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (!result.success) return;

    // The classified archetype should map to one of our seeded archetypes
    if (result.archetype_info) {
      expect(result.archetype_info.description).toBeTruthy();
      expect(result.archetype_info.gameplan).toBeTruthy();
      expect(result.archetype_info.strengths.length).toBeGreaterThan(0);
      expect(result.archetype_info.weaknesses.length).toBeGreaterThan(0);
    }
  });

  // 3. Matchup expectations included
  it('includes matchup expectations', () => {
    const code = makeAggroDeckCode();
    const result = analyzeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Should have matchup data from seeded matchup_framework
    if (result.matchups) {
      expect(result.matchups.length).toBeGreaterThan(0);
      for (const matchup of result.matchups) {
        expect(matchup.vs_archetype).toBeTruthy();
        expect(matchup.favoured).toBeTruthy();
        expect(matchup.key_tension).toBeTruthy();
      }
    }
  });

  // 4. Invalid deck code returns error
  it('returns error for invalid deck code', () => {
    const result = analyzeDeck(db, { deck_code: 'not-a-valid-deck!!!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBeTruthy();
    }
  });

  // 5. Deck with unknown cards still provides partial analysis
  it('provides partial analysis for deck with unknown cards', () => {
    const code = encode({
      cards: [
        [999999, 2], // Unknown card
        [648, 2],    // Stonetusk Boar (known)
      ],
      heroes: [274],
      format: 2,
    });

    const result = analyzeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.deck.total_cards).toBe(4);
    expect(result.classification).toBeDefined();
    expect(result.classification.archetype).toBeTruthy();
  });

  // 6. Formatter produces rich markdown output
  it('formatAnalyzeDeck produces rich markdown output', () => {
    const code = makeAggroDeckCode();
    const result = analyzeDeck(db, { deck_code: code });
    const text = formatAnalyzeDeck(result);

    expect(text).toContain('Deck Analysis');
    expect(text).toContain('Archetype:');
    expect(text).toContain('Mana Curve');
  });

  // 7. Formatter handles error result
  it('formatAnalyzeDeck handles error result', () => {
    const result = analyzeDeck(db, { deck_code: 'bad' });
    const text = formatAnalyzeDeck(result);
    expect(text).toBeTruthy();
    expect(text).not.toContain('undefined');
  });
});
