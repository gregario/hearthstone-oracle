// --- Types ---

export interface DeckProfile {
  avg_cost: number;
  cards: Array<{ mana_cost: number | null; type: string | null; text: string | null; keywords: string | null }>;
  total_cards: number;
  mana_curve: Record<string, number>;       // "0", "1", ..., "7+"
  type_distribution: Record<string, number>; // "MINION", "SPELL", etc.
}

export interface ClassificationResult {
  archetype: string;    // "aggro", "control", "combo", "midrange", "tempo", "value"
  confidence: number;   // 0.0-1.0
  reasoning: string;    // human-readable explanation
}

// --- Signal helpers ---

function countCardsMatching(cards: DeckProfile['cards'], test: (c: DeckProfile['cards'][0]) => boolean): number {
  return cards.filter(test).length;
}

function textContains(text: string | null, ...terms: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

function keywordsContain(keywords: string | null, term: string): boolean {
  if (!keywords) return false;
  const lower = keywords.toLowerCase();
  return lower.includes(term.toLowerCase());
}

// --- Score calculators ---

function scoreAggro(profile: DeckProfile): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Low average cost (<3.0): +3
  if (profile.avg_cost < 3.0) {
    score += 3;
    signals.push(`Low average mana cost (${profile.avg_cost.toFixed(1)})`);
  }

  // Many 1-2 cost cards (>40% of deck): +2
  const lowCostCount = (profile.mana_curve['1'] ?? 0) + (profile.mana_curve['2'] ?? 0);
  if (profile.total_cards > 0 && lowCostCount / profile.total_cards > 0.4) {
    score += 2;
    signals.push(`${lowCostCount} cards costing 1-2 (${Math.round((lowCostCount / profile.total_cards) * 100)}% of deck)`);
  }

  // Cards with face damage / Charge / Rush: +1 each
  const chargeCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'Charge') || keywordsContain(c.keywords, 'CHARGE'),
  );
  if (chargeCount > 0) {
    score += Math.min(chargeCount, 3);
    signals.push(`${chargeCount} card(s) with Charge`);
  }

  const faceDamageCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'deal damage to the enemy hero', 'face damage'),
  );
  if (faceDamageCount > 0) {
    score += Math.min(faceDamageCount, 3);
    signals.push(`${faceDamageCount} card(s) with face damage effects`);
  }

  const rushCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'Rush') || keywordsContain(c.keywords, 'RUSH'),
  );
  if (rushCount > 0) {
    score += Math.min(rushCount, 2);
    signals.push(`${rushCount} card(s) with Rush`);
  }

  // Few cards costing 6+: +1
  const expensiveCount = (profile.mana_curve['6'] ?? 0) + (profile.mana_curve['7+'] ?? 0);
  if (expensiveCount <= 2) {
    score += 1;
    signals.push('Few expensive cards');
  }

  return { score, signals };
}

function scoreControl(profile: DeckProfile): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // High average cost (>4.0): +3
  if (profile.avg_cost > 4.0) {
    score += 3;
    signals.push(`High average mana cost (${profile.avg_cost.toFixed(1)})`);
  }

  // Cards with "destroy" / "remove" / "clear" text: +2
  const removalCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'destroy', 'remove', 'clear'),
  );
  if (removalCount > 0) {
    score += 2;
    signals.push(`${removalCount} removal card(s)`);
  }

  // Cards with "heal" / "restore" / "armor": +2
  const healCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'heal', 'restore', 'armor'),
  );
  if (healCount > 0) {
    score += 2;
    signals.push(`${healCount} healing/armor card(s)`);
  }

  // Cards costing 7+: +1 per card (max 3)
  const sevenPlus = profile.mana_curve['7+'] ?? 0;
  if (sevenPlus > 0) {
    const bonus = Math.min(sevenPlus, 3);
    score += bonus;
    signals.push(`${sevenPlus} card(s) costing 7+`);
  }

  return { score, signals };
}

function scoreCombo(profile: DeckProfile): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Many spells (>50% spells): +2
  const spellCount = profile.type_distribution['SPELL'] ?? 0;
  if (profile.total_cards > 0 && spellCount / profile.total_cards > 0.5) {
    score += 2;
    signals.push(`Spell-heavy deck (${Math.round((spellCount / profile.total_cards) * 100)}% spells)`);
  }

  // Cards with "draw" text: +1 per card (max 3)
  const drawCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'draw'),
  );
  if (drawCount > 0) {
    const bonus = Math.min(drawCount, 3);
    score += bonus;
    signals.push(`${drawCount} card draw effect(s)`);
  }

  // Low minion count (<10): +2
  const minionCount = profile.type_distribution['MINION'] ?? 0;
  if (minionCount < 10) {
    score += 2;
    signals.push(`Low minion count (${minionCount})`);
  }

  // Cards with COMBO mechanic: +2
  const comboCount = countCardsMatching(profile.cards, (c) =>
    keywordsContain(c.keywords, 'COMBO'),
  );
  if (comboCount > 0) {
    score += 2;
    signals.push(`${comboCount} card(s) with Combo keyword`);
  }

  return { score, signals };
}

function scoreMidrange(profile: DeckProfile): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Average cost 3.0-4.5: +3
  if (profile.avg_cost >= 3.0 && profile.avg_cost <= 4.5) {
    score += 3;
    signals.push(`Balanced average mana cost (${profile.avg_cost.toFixed(1)})`);
  }

  // Balanced curve (significant cards at 3, 4, 5 cost): +2
  const midCards = (profile.mana_curve['3'] ?? 0) + (profile.mana_curve['4'] ?? 0) + (profile.mana_curve['5'] ?? 0);
  if (midCards >= 10) {
    score += 2;
    signals.push(`Strong mid-game curve (${midCards} cards at 3-5 cost)`);
  }

  // Good mix of minions and spells (40-70% minions): +2
  const minionCount = profile.type_distribution['MINION'] ?? 0;
  if (profile.total_cards > 0) {
    const minionPct = minionCount / profile.total_cards;
    if (minionPct >= 0.4 && minionPct <= 0.7) {
      score += 2;
      signals.push(`Balanced minion/spell mix (${Math.round(minionPct * 100)}% minions)`);
    }
  }

  return { score, signals };
}

function scoreTempo(profile: DeckProfile): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Average cost 2.5-3.5: +2
  if (profile.avg_cost >= 2.5 && profile.avg_cost <= 3.5) {
    score += 2;
    signals.push(`Tempo-friendly average cost (${profile.avg_cost.toFixed(1)})`);
  }

  // Weapons: +2
  const weaponCount = profile.type_distribution['WEAPON'] ?? 0;
  if (weaponCount > 0) {
    score += 2;
    signals.push(`${weaponCount} weapon(s)`);
  }

  // Cards with Rush: +1 each (max 2)
  const rushCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'Rush') || keywordsContain(c.keywords, 'RUSH'),
  );
  if (rushCount > 0) {
    const bonus = Math.min(rushCount, 2);
    score += bonus;
    signals.push(`${rushCount} Rush card(s)`);
  }

  // Good 1-3 curve: +2
  const earlyCurve = (profile.mana_curve['1'] ?? 0) + (profile.mana_curve['2'] ?? 0) + (profile.mana_curve['3'] ?? 0);
  if (earlyCurve >= 12) {
    score += 2;
    signals.push(`Strong early curve (${earlyCurve} cards at 1-3 cost)`);
  }

  return { score, signals };
}

function scoreValue(profile: DeckProfile): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // Cards with "Discover" / "generate" / "add.*to your hand" text: +2 per card (max 4)
  const generateCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'Discover', 'generate', 'add') && textContains(c.text, 'hand'),
  );
  const discoverOnly = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'Discover') || keywordsContain(c.keywords, 'DISCOVER'),
  );
  const totalGen = Math.max(generateCount, discoverOnly);
  if (totalGen > 0) {
    const bonus = Math.min(totalGen * 2, 4);
    score += bonus;
    signals.push(`${totalGen} resource generation card(s)`);
  }

  // Cards with "copy" text: +1
  const copyCount = countCardsMatching(profile.cards, (c) =>
    textContains(c.text, 'copy'),
  );
  if (copyCount > 0) {
    score += 1;
    signals.push(`${copyCount} copy effect(s)`);
  }

  // High card count at 5+ cost: +1
  const fivePlus = (profile.mana_curve['5'] ?? 0) + (profile.mana_curve['6'] ?? 0) + (profile.mana_curve['7+'] ?? 0);
  if (fivePlus >= 8) {
    score += 1;
    signals.push(`${fivePlus} cards costing 5+`);
  }

  return { score, signals };
}

// --- Main classifier ---

export function classifyArchetype(profile: DeckProfile): ClassificationResult {
  const scores: Array<{ archetype: string; score: number; signals: string[] }> = [
    { archetype: 'aggro', ...scoreAggro(profile) },
    { archetype: 'control', ...scoreControl(profile) },
    { archetype: 'combo', ...scoreCombo(profile) },
    { archetype: 'midrange', ...scoreMidrange(profile) },
    { archetype: 'tempo', ...scoreTempo(profile) },
    { archetype: 'value', ...scoreValue(profile) },
  ];

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];
  const gap = top.score - second.score;

  // Confidence based on gap
  let confidence: number;
  if (gap > 3) {
    confidence = Math.min(0.8 + gap * 0.03, 1.0);
  } else if (gap >= 1) {
    confidence = 0.5 + (gap - 1) * 0.1;
  } else {
    confidence = Math.max(0.3, 0.5 - (1 - gap) * 0.2);
  }

  // Build reasoning from top archetype signals
  const reasoning = top.signals.length > 0
    ? top.signals.join(', ') + ` suggest ${top.archetype === 'aggro' ? 'an aggressive' : `a ${top.archetype}`} strategy.`
    : `Classified as ${top.archetype} based on overall deck composition.`;

  return {
    archetype: top.archetype,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
  };
}
