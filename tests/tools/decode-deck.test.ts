import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { encode } from 'deckstrings';
import { createTestDb } from '../helpers.js';
import { decodeDeck } from '../../src/tools/decode-deck.js';
import { formatDecodeDeck } from '../../src/format.js';

describe('decode_deck', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  // Build a test deck code from known fixture cards
  // Reno (dbfId 27228) x1, Fireball (315) x2, Boar (604) x2
  // Hero: Jaina Proudmoore (dbfId 274) — we won't have her in DB, but that's fine
  function makeTestDeckCode(): string {
    return encode({
      cards: [
        [27228, 1], // Reno Jackson x1
        [315, 2],   // Fireball x2
        [604, 2],   // Stonetusk Boar x2
      ],
      heroes: [274], // Mage hero dbfId
      format: 2,     // Standard
    });
  }

  // Valid deck code decodes to correct cards with counts
  it('decodes a valid deck code to correct cards and counts', () => {
    const code = makeTestDeckCode();
    const result = decodeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.total_cards).toBe(5); // 1 + 2 + 2
      expect(result.format).toBe('Standard');
      const cardNames = result.cards.map((c) => c.card.name);
      expect(cardNames).toContain('Reno Jackson');
      expect(cardNames).toContain('Fireball');
      expect(cardNames).toContain('Stonetusk Boar');

      // Check counts
      const reno = result.cards.find((c) => c.card.name === 'Reno Jackson');
      expect(reno?.count).toBe(1);
      const fireball = result.cards.find((c) => c.card.name === 'Fireball');
      expect(fireball?.count).toBe(2);
    }
  });

  // Mana curve calculated correctly
  it('calculates mana curve correctly', () => {
    const code = makeTestDeckCode();
    const result = decodeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (result.success) {
      // Reno=6 mana x1, Fireball=4 mana x2, Boar=1 mana x2
      expect(result.mana_curve['1']).toBe(2); // 2x Boar
      expect(result.mana_curve['4']).toBe(2); // 2x Fireball
      expect(result.mana_curve['6']).toBe(1); // 1x Reno
    }
  });

  // Type distribution calculated correctly
  it('calculates type distribution correctly', () => {
    const code = makeTestDeckCode();
    const result = decodeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (result.success) {
      // Reno=MINION, Boar=MINION (3 minions total), Fireball=SPELL (2 total)
      expect(result.type_distribution['MINION']).toBe(3);
      expect(result.type_distribution['SPELL']).toBe(2);
    }
  });

  // Invalid deck code returns error
  it('returns error for invalid deck code', () => {
    const result = decodeDeck(db, { deck_code: 'not-a-valid-deck-code!!!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toBeTruthy();
    }
  });

  // Deck with unknown card IDs flags them gracefully
  it('handles unknown card IDs gracefully', () => {
    const code = encode({
      cards: [
        [999999, 2], // Unknown card
        [315, 2],    // Fireball (known)
      ],
      heroes: [274],
      format: 2,
    });
    const result = decodeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (result.success) {
      // Should still decode — unknown cards get a placeholder name
      expect(result.total_cards).toBe(4);
      const unknown = result.cards.find((c) => c.card.name.includes('Unknown'));
      expect(unknown).toBeDefined();
      expect(unknown?.count).toBe(2);
    }
  });

  // Unknown card placeholder explains the likely cause and remediation
  it('returns a richer placeholder message for unknown dbfIds', () => {
    const code = encode({
      cards: [
        [999999, 1], // Unknown — simulates a dbfId from a future expansion
      ],
      heroes: [274],
      format: 2,
    });
    const result = decodeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (result.success) {
      const unknown = result.cards[0]!.card;
      // Must include the dbfId so the user can look it up
      expect(unknown.name).toContain('999999');
      // Must explain the likely cause (recent expansion)
      expect(unknown.name.toLowerCase()).toContain('recent expansion');
      // Must point at the remediation
      expect(unknown.name.toLowerCase()).toContain('refresh data');
      // Other fields stay null (we don't have the data)
      expect(unknown.mana_cost).toBeNull();
      expect(unknown.type).toBeNull();
    }
  });

  // Wild format
  it('identifies Wild format', () => {
    const code = encode({
      cards: [[315, 2]],
      heroes: [274],
      format: 1, // Wild
    });
    const result = decodeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.format).toBe('Wild');
    }
  });

  // 7+ mana bucket
  it('groups 7+ mana costs together', () => {
    // Tirion is 8 mana, Reno is 6 mana
    const code = encode({
      cards: [
        [391, 1],   // Tirion (8 mana)
        [27228, 1], // Reno (6 mana)
      ],
      heroes: [274],
      format: 2,
    });
    const result = decodeDeck(db, { deck_code: code });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.mana_curve['7+']).toBe(1); // Tirion at 8
      expect(result.mana_curve['6']).toBe(1);  // Reno at 6
    }
  });

  // Formatter
  it('formatDecodeDeck formats a successful decode', () => {
    const code = makeTestDeckCode();
    const result = decodeDeck(db, { deck_code: code });
    const text = formatDecodeDeck(result);
    expect(text).toContain('Standard');
    expect(text).toContain('Reno Jackson');
    expect(text).toContain('Mana Curve');
  });

  it('formatDecodeDeck formats an error result', () => {
    const result = decodeDeck(db, { deck_code: 'bad' });
    const text = formatDecodeDeck(result);
    expect(text).toBeTruthy();
    expect(text).not.toContain('undefined');
  });
});
