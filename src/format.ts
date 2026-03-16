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
