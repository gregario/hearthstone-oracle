-- Layer 1: Card Data (from HearthstoneJSON)
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,           -- dbfId as string
  card_id TEXT,                  -- Blizzard card ID string (e.g. "CS2_029")
  name TEXT NOT NULL,
  mana_cost INTEGER,
  type TEXT,                     -- MINION, SPELL, WEAPON, HERO, LOCATION
  card_set TEXT,
  set_name TEXT,
  player_class TEXT,             -- Class name or NEUTRAL
  rarity TEXT,                   -- FREE, COMMON, RARE, EPIC, LEGENDARY
  attack INTEGER,
  health INTEGER,
  durability INTEGER,            -- For weapons
  armor INTEGER,                 -- For hero cards
  text TEXT,                     -- Card text (with markup)
  flavor TEXT,
  artist TEXT,
  collectible INTEGER DEFAULT 0,
  elite INTEGER DEFAULT 0,       -- 1 if legendary
  race TEXT,                     -- Minion tribe
  spell_school TEXT,
  keywords TEXT                  -- JSON array of keywords
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  name, text,
  content='cards', content_rowid='rowid'
);

-- FTS sync triggers
CREATE TRIGGER IF NOT EXISTS cards_ai AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(rowid, name, text) VALUES (new.rowid, new.name, new.text);
END;
CREATE TRIGGER IF NOT EXISTS cards_ad AFTER DELETE ON cards BEGIN
  INSERT INTO cards_fts(cards_fts, rowid, name, text) VALUES('delete', old.rowid, old.name, old.text);
END;
CREATE TRIGGER IF NOT EXISTS cards_au AFTER UPDATE ON cards BEGIN
  INSERT INTO cards_fts(cards_fts, rowid, name, text) VALUES('delete', old.rowid, old.name, old.text);
  INSERT INTO cards_fts(rowid, name, text) VALUES (new.rowid, new.name, new.text);
END;

-- Keywords reference
CREATE TABLE IF NOT EXISTS keywords (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  related_keywords TEXT           -- JSON array
);

-- Card sets
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  release_date TEXT,
  type TEXT,
  is_standard INTEGER DEFAULT 0
);

-- Layer 2: Strategy Knowledge
CREATE TABLE IF NOT EXISTS archetypes (
  name TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  gameplan TEXT NOT NULL,
  win_conditions TEXT NOT NULL,   -- JSON array
  strengths TEXT NOT NULL,        -- JSON array
  weaknesses TEXT NOT NULL,       -- JSON array
  example_decks TEXT              -- JSON array
);

CREATE TABLE IF NOT EXISTS class_identities (
  class TEXT PRIMARY KEY,
  identity TEXT NOT NULL,
  hero_power_name TEXT NOT NULL,
  hero_power_cost INTEGER NOT NULL DEFAULT 2,
  hero_power_effect TEXT NOT NULL,
  hero_power_implications TEXT NOT NULL,
  historical_archetypes TEXT NOT NULL,  -- JSON array
  strengths TEXT NOT NULL,              -- JSON array
  weaknesses TEXT NOT NULL,             -- JSON array
  early_game TEXT NOT NULL,
  mid_game TEXT NOT NULL,
  late_game TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matchup_framework (
  archetype_a TEXT NOT NULL,
  archetype_b TEXT NOT NULL,
  favoured TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  key_tension TEXT NOT NULL,
  archetype_a_priority TEXT NOT NULL,
  archetype_b_priority TEXT NOT NULL,
  PRIMARY KEY (archetype_a, archetype_b)
);

CREATE TABLE IF NOT EXISTS game_concepts (
  name TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  hearthstone_application TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_class ON cards(player_class);
CREATE INDEX IF NOT EXISTS idx_cards_cost ON cards(mana_cost);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(card_set);
CREATE INDEX IF NOT EXISTS idx_cards_collectible ON cards(collectible);
CREATE INDEX IF NOT EXISTS idx_cards_race ON cards(race);
