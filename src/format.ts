import type { GetKeywordResult } from './tools/get-keyword.js';
import type { DecodeDeckResult } from './tools/decode-deck.js';
import type { GetArchetypeResult } from './tools/get-archetype.js';
import type { GetClassIdentityResult } from './tools/get-class-identity.js';
import type { GetMatchupResult } from './tools/get-matchup.js';
import type { ExplainConceptResult } from './tools/explain-concept.js';

// --- Types ---

export interface CardSummary {
  name: string;
  mana_cost: number | null;
  type: string | null;
  player_class: string | null;
  rarity: string | null;
  text: string | null;
  attack: number | null;
  health: number | null;
  keywords: string[];
}

export interface SearchCardsResult {
  cards: CardSummary[];
  total: number;
}

export interface CardDetail {
  id: string;
  card_id: string | null;
  name: string;
  mana_cost: number | null;
  type: string | null;
  card_set: string | null;
  set_name: string | null;
  player_class: string | null;
  rarity: string | null;
  attack: number | null;
  health: number | null;
  durability: number | null;
  armor: number | null;
  text: string | null;
  flavor: string | null;
  artist: string | null;
  collectible: number;
  elite: number;
  race: string | null;
  spell_school: string | null;
  keywords: string[];
}

export type GetCardResult =
  | { found: true; card: CardDetail }
  | { found: false; message: string; suggestions?: string[] };

// --- Formatters ---

export function formatSearchCards(result: SearchCardsResult): string {
  if (result.cards.length === 0) {
    return 'No cards found matching your search criteria.';
  }

  const lines: string[] = [`Found ${result.total} card(s):\n`];
  for (const card of result.cards) {
    lines.push(
      `- **${card.name}** (${card.mana_cost ?? '?'} mana) — ${card.type ?? 'Unknown'} [${card.player_class ?? 'NEUTRAL'}]`
    );
    if (card.text) {
      // Show first line only as preview
      const preview = card.text.split('\n')[0];
      lines.push(`  ${preview}`);
    }
  }
  return lines.join('\n');
}

export function formatGetCard(result: GetCardResult): string {
  if (!result.found) {
    let msg = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      msg += '\n\nDid you mean:\n';
      msg += result.suggestions.map(s => `- ${s}`).join('\n');
    }
    return msg;
  }

  const card = result.card;
  const lines: string[] = [];

  // Header
  lines.push(`# ${card.name} {${card.mana_cost ?? '?'} mana}`);

  // Type line
  const typeParts: string[] = [];
  if (card.rarity) typeParts.push(card.rarity);
  if (card.type) typeParts.push(card.type);
  if (card.race) typeParts.push(`(${card.race})`);
  if (card.player_class) typeParts.push(`[${card.player_class}]`);
  lines.push(typeParts.join(' '));

  // Set
  if (card.card_set || card.set_name) {
    lines.push(`Set: ${card.set_name ?? card.card_set}`);
  }

  // Text
  if (card.text) {
    lines.push('');
    lines.push(card.text);
  }

  // Stats
  if (card.type === 'MINION' && card.attack != null && card.health != null) {
    lines.push('');
    lines.push(`${card.attack}/${card.health}`);
  } else if (card.type === 'WEAPON' && card.attack != null && card.durability != null) {
    lines.push('');
    lines.push(`${card.attack}/${card.durability}`);
  } else if (card.type === 'HERO' && card.armor != null) {
    lines.push('');
    lines.push(`Armor: ${card.armor}`);
  }

  // Keywords
  if (card.keywords.length > 0) {
    lines.push(`Keywords: ${card.keywords.join(', ')}`);
  }

  // Spell school
  if (card.spell_school) {
    lines.push(`Spell School: ${card.spell_school}`);
  }

  // Flavor
  if (card.flavor) {
    lines.push('');
    lines.push(`*${card.flavor}*`);
  }

  return lines.join('\n');
}

// --- get_keyword formatter ---

export function formatGetKeyword(result: GetKeywordResult): string {
  if (!result.found) {
    let msg = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      msg += '\n\nDid you mean:\n';
      msg += result.suggestions.map((s) => `- ${s}`).join('\n');
    }
    return msg;
  }

  const lines: string[] = [];
  lines.push(`# ${result.keyword.name}`);
  lines.push(result.keyword.description);

  if (result.keyword.related_keywords.length > 0) {
    lines.push(`Related: ${result.keyword.related_keywords.join(', ')}`);
  }

  if (result.cards.length > 0) {
    lines.push('');
    lines.push(`## Cards with ${result.keyword.name} (${result.cards.length})`);
    for (const card of result.cards) {
      lines.push(
        `- **${card.name}** (${card.mana_cost ?? '?'} mana) — ${card.type ?? 'Unknown'} [${card.player_class ?? 'NEUTRAL'}]`,
      );
    }
  }

  return lines.join('\n');
}

// --- decode_deck formatter ---

export function formatDecodeDeck(result: DecodeDeckResult): string {
  if (!result.success) {
    return result.message;
  }

  const lines: string[] = [];
  lines.push(`# Deck: ${result.hero_class} (${result.format})`);
  lines.push(`Total cards: ${result.total_cards}`);
  lines.push('');

  // Cards list
  lines.push('## Cards');
  for (const { card, count } of result.cards) {
    lines.push(
      `- ${count}x **${card.name}** (${card.mana_cost ?? '?'} mana) — ${card.type ?? 'Unknown'}`,
    );
  }

  // Mana Curve
  lines.push('');
  lines.push('## Mana Curve');
  const buckets = ['0', '1', '2', '3', '4', '5', '6', '7+'];
  for (const bucket of buckets) {
    const count = result.mana_curve[bucket] ?? 0;
    if (count > 0) {
      lines.push(`${bucket}: ${'#'.repeat(count)} (${count})`);
    }
  }

  // Type Distribution
  lines.push('');
  lines.push('## Type Distribution');
  for (const [type, count] of Object.entries(result.type_distribution)) {
    lines.push(`- ${type}: ${count}`);
  }

  return lines.join('\n');
}

// --- get_archetype formatter ---

export function formatGetArchetype(result: GetArchetypeResult): string {
  if (!result.found) {
    let msg = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      msg += '\n\nDid you mean:\n';
      msg += result.suggestions.map((s) => `- ${s}`).join('\n');
    }
    return msg;
  }

  const a = result.archetype;
  const lines: string[] = [];
  lines.push(`# ${a.name}`);
  lines.push('');
  lines.push(`## Description`);
  lines.push(a.description);
  lines.push('');
  lines.push(`## Gameplan`);
  lines.push(a.gameplan);
  lines.push('');
  lines.push(`## Win Conditions`);
  for (const wc of a.win_conditions) {
    lines.push(`- ${wc}`);
  }
  lines.push('');
  lines.push(`## Strengths`);
  for (const s of a.strengths) {
    lines.push(`- ${s}`);
  }
  lines.push('');
  lines.push(`## Weaknesses`);
  for (const w of a.weaknesses) {
    lines.push(`- ${w}`);
  }
  if (a.example_decks.length > 0) {
    lines.push('');
    lines.push(`## Example Decks`);
    for (const ed of a.example_decks) {
      lines.push(`- ${ed}`);
    }
  }
  return lines.join('\n');
}

// --- get_class_identity formatter ---

export function formatGetClassIdentity(result: GetClassIdentityResult): string {
  if (!result.found) {
    let msg = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      msg += '\n\nDid you mean:\n';
      msg += result.suggestions.map((s) => `- ${s}`).join('\n');
    }
    return msg;
  }

  if ('overview' in result && result.overview) {
    const lines: string[] = [];
    lines.push('# Hearthstone Classes');
    lines.push('');
    for (const cls of result.classes) {
      lines.push(`- **${cls.class}** (${cls.hero_power_name}) — ${cls.identity}`);
    }
    return lines.join('\n');
  }

  const id = result.identity;
  const lines: string[] = [];
  lines.push(`# ${id.class}`);
  lines.push('');
  lines.push(`## Strategic Identity`);
  lines.push(id.identity);
  lines.push('');
  lines.push(`## Hero Power: ${id.hero_power_name} (${id.hero_power_cost} mana)`);
  lines.push(id.hero_power_effect);
  lines.push('');
  lines.push(`**Implications:** ${id.hero_power_implications}`);
  lines.push('');
  lines.push(`## Strengths`);
  for (const s of id.strengths) {
    lines.push(`- ${s}`);
  }
  lines.push('');
  lines.push(`## Weaknesses`);
  for (const w of id.weaknesses) {
    lines.push(`- ${w}`);
  }
  lines.push('');
  lines.push(`## Game Phases`);
  lines.push(`**Early Game:** ${id.early_game}`);
  lines.push(`**Mid Game:** ${id.mid_game}`);
  lines.push(`**Late Game:** ${id.late_game}`);
  if (id.historical_archetypes.length > 0) {
    lines.push('');
    lines.push(`## Historical Archetypes`);
    for (const arch of id.historical_archetypes) {
      lines.push(`- ${arch}`);
    }
  }
  return lines.join('\n');
}

// --- get_matchup formatter ---

export function formatGetMatchup(result: GetMatchupResult): string {
  if (!result.found) {
    let msg = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      msg += '\n\nAvailable archetypes:\n';
      msg += result.suggestions.map((s) => `- ${s}`).join('\n');
    }
    return msg;
  }

  const m = result.matchup;
  const lines: string[] = [];
  lines.push(`## ${m.archetype_a} vs ${m.archetype_b}`);
  lines.push('');
  lines.push(`**Favoured:** ${m.favoured}`);
  lines.push('');
  lines.push(`**Reasoning:** ${m.reasoning}`);
  lines.push('');
  lines.push(`**Key Tension:** ${m.key_tension}`);
  lines.push('');
  lines.push(`**${m.archetype_a} should prioritise:** ${m.archetype_a_priority}`);
  lines.push('');
  lines.push(`**${m.archetype_b} should prioritise:** ${m.archetype_b_priority}`);
  return lines.join('\n');
}

// --- explain_concept formatter ---

export function formatExplainConcept(result: ExplainConceptResult): string {
  if (!result.found) {
    let msg = result.message;
    if (result.suggestions && result.suggestions.length > 0) {
      msg += '\n\nDid you mean:\n';
      msg += result.suggestions.map((s) => `- ${s}`).join('\n');
    }
    return msg;
  }

  const c = result.concept;
  const lines: string[] = [];
  lines.push(`## ${c.name}`);
  lines.push('');
  lines.push(`**Category:** ${c.category}`);
  lines.push('');
  lines.push(c.description);
  lines.push('');
  lines.push(`**In Hearthstone:** ${c.hearthstone_application}`);
  return lines.join('\n');
}
