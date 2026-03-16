import { describe, it, expect } from 'vitest';
import { classifyArchetype, type DeckProfile } from '../../src/knowledge/archetype-classifier.js';

function makeDeckProfile(overrides: Partial<DeckProfile> = {}): DeckProfile {
  return {
    avg_cost: 3.0,
    cards: [],
    total_cards: 30,
    mana_curve: {},
    type_distribution: {},
    ...overrides,
  };
}

describe('archetype-classifier', () => {
  // 1. Low-cost deck classified as aggro
  it('classifies a low-cost deck as aggro', () => {
    const profile = makeDeckProfile({
      avg_cost: 2.0,
      total_cards: 30,
      mana_curve: { '1': 10, '2': 10, '3': 6, '4': 4 },
      type_distribution: { MINION: 22, SPELL: 8 },
      cards: [
        // Many cheap cards, some with Charge text
        ...Array(10).fill({ mana_cost: 1, type: 'MINION', text: 'Charge', keywords: '["CHARGE"]' }),
        ...Array(10).fill({ mana_cost: 2, type: 'MINION', text: 'Deal damage to the enemy hero', keywords: null }),
        ...Array(6).fill({ mana_cost: 3, type: 'MINION', text: null, keywords: null }),
        ...Array(4).fill({ mana_cost: 4, type: 'SPELL', text: 'Deal 6 damage.', keywords: null }),
      ],
    });

    const result = classifyArchetype(profile);
    expect(result.archetype).toBe('aggro');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasoning).toBeTruthy();
  });

  // 2. High-cost deck classified as control
  it('classifies a high-cost deck as control', () => {
    const profile = makeDeckProfile({
      avg_cost: 5.5,
      total_cards: 30,
      mana_curve: { '2': 2, '4': 4, '5': 6, '6': 6, '7+': 8, '3': 4 },
      type_distribution: { MINION: 14, SPELL: 16 },
      cards: [
        ...Array(4).fill({ mana_cost: 7, type: 'SPELL', text: 'Destroy all minions.', keywords: null }),
        ...Array(4).fill({ mana_cost: 8, type: 'MINION', text: 'Restore 8 health to your hero.', keywords: null }),
        ...Array(6).fill({ mana_cost: 5, type: 'SPELL', text: 'Destroy a minion.', keywords: null }),
        ...Array(6).fill({ mana_cost: 6, type: 'SPELL', text: 'Remove all minions. Gain armor.', keywords: null }),
        ...Array(2).fill({ mana_cost: 2, type: 'SPELL', text: 'Heal your hero for 5.', keywords: null }),
        ...Array(4).fill({ mana_cost: 4, type: 'MINION', text: null, keywords: null }),
        ...Array(4).fill({ mana_cost: 3, type: 'MINION', text: null, keywords: null }),
      ],
    });

    const result = classifyArchetype(profile);
    expect(result.archetype).toBe('control');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  // 3. Spell-heavy deck with draw cards classified as combo
  it('classifies a spell-heavy draw-heavy deck as combo', () => {
    const profile = makeDeckProfile({
      avg_cost: 3.0,
      total_cards: 30,
      mana_curve: { '1': 4, '2': 6, '3': 6, '4': 4, '5': 4, '6': 4, '7+': 2 },
      type_distribution: { MINION: 6, SPELL: 24 },
      cards: [
        ...Array(6).fill({ mana_cost: 2, type: 'SPELL', text: 'Draw 2 cards.', keywords: null }),
        ...Array(6).fill({ mana_cost: 3, type: 'SPELL', text: 'Deal 3 damage. Draw a card.', keywords: null }),
        ...Array(6).fill({ mana_cost: 1, type: 'SPELL', text: 'Freeze. Draw a card.', keywords: '["COMBO"]' }),
        ...Array(6).fill({ mana_cost: 5, type: 'SPELL', text: 'Deal 15 damage to the enemy hero.', keywords: null }),
        ...Array(6).fill({ mana_cost: 4, type: 'MINION', text: null, keywords: null }),
      ],
    });

    const result = classifyArchetype(profile);
    expect(result.archetype).toBe('combo');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  // 4. Balanced-cost deck classified as midrange
  it('classifies a balanced-cost deck as midrange', () => {
    const profile = makeDeckProfile({
      avg_cost: 3.8,
      total_cards: 30,
      mana_curve: { '1': 2, '2': 4, '3': 8, '4': 6, '5': 6, '6': 2, '7+': 2 },
      type_distribution: { MINION: 18, SPELL: 12 },
      cards: [
        ...Array(2).fill({ mana_cost: 1, type: 'MINION', text: null, keywords: null }),
        ...Array(4).fill({ mana_cost: 2, type: 'MINION', text: null, keywords: null }),
        ...Array(8).fill({ mana_cost: 3, type: 'MINION', text: null, keywords: null }),
        ...Array(6).fill({ mana_cost: 4, type: 'MINION', text: null, keywords: null }),
        ...Array(6).fill({ mana_cost: 5, type: 'SPELL', text: null, keywords: null }),
        ...Array(2).fill({ mana_cost: 6, type: 'MINION', text: null, keywords: null }),
        ...Array(2).fill({ mana_cost: 7, type: 'MINION', text: null, keywords: null }),
      ],
    });

    const result = classifyArchetype(profile);
    expect(result.archetype).toBe('midrange');
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  // 5. Ambiguous deck has low confidence
  it('returns low confidence for an ambiguous deck', () => {
    // A deck that scores similarly across multiple archetypes
    const profile = makeDeckProfile({
      avg_cost: 3.2,
      total_cards: 30,
      mana_curve: { '1': 4, '2': 6, '3': 6, '4': 6, '5': 4, '6': 2, '7+': 2 },
      type_distribution: { MINION: 15, SPELL: 15 },
      cards: [
        ...Array(15).fill({ mana_cost: 3, type: 'MINION', text: null, keywords: null }),
        ...Array(15).fill({ mana_cost: 3, type: 'SPELL', text: null, keywords: null }),
      ],
    });

    const result = classifyArchetype(profile);
    // For ambiguous decks, confidence should be lower
    expect(result.confidence).toBeLessThanOrEqual(0.7);
    expect(result.reasoning).toBeTruthy();
  });

  // 6. Confidence: high gap = high confidence
  it('gives high confidence when one archetype clearly dominates', () => {
    // Extremely aggro-like profile
    const profile = makeDeckProfile({
      avg_cost: 1.5,
      total_cards: 30,
      mana_curve: { '1': 16, '2': 10, '3': 4 },
      type_distribution: { MINION: 26, SPELL: 4 },
      cards: [
        ...Array(16).fill({ mana_cost: 1, type: 'MINION', text: 'Charge', keywords: '["CHARGE"]' }),
        ...Array(10).fill({ mana_cost: 2, type: 'MINION', text: 'Deal damage to the enemy hero', keywords: null }),
        ...Array(4).fill({ mana_cost: 3, type: 'SPELL', text: 'Deal 3 damage.', keywords: null }),
      ],
    });

    const result = classifyArchetype(profile);
    expect(result.archetype).toBe('aggro');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
