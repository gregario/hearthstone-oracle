import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// --- Types ---

export interface CardRow {
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
  keywords: string | null;
}

// --- Constants ---

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.hearthstone-oracle');
const DB_FILENAME = 'cards.sqlite';
const BATCH_SIZE = 500;

// --- Schema loading ---

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function loadSchema(): string {
  return fs.readFileSync(SCHEMA_PATH, 'utf-8');
}

// --- Database management ---

function ensureDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Opens (or creates) a SQLite database and initializes the schema.
 *
 * @param dataDir - Custom data directory. Defaults to ~/.hearthstone-oracle/.
 *                  Pass ':memory:' for an in-memory database (tests).
 * @returns A better-sqlite3 Database instance with schema applied.
 */
export function getDatabase(dataDir?: string): Database.Database {
  let db: Database.Database;

  if (dataDir === ':memory:') {
    db = new Database(':memory:');
  } else {
    const dir = dataDir ?? DEFAULT_DATA_DIR;
    ensureDataDir(dir);
    const dbPath = path.join(dir, DB_FILENAME);
    db = new Database(dbPath);
  }

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema (idempotent via IF NOT EXISTS)
  initializeSchema(db);

  return db;
}

/**
 * Runs the schema SQL against the database.
 * Safe to call multiple times due to IF NOT EXISTS clauses.
 */
function initializeSchema(db: Database.Database): void {
  let schema: string;
  try {
    schema = loadSchema();
  } catch {
    throw new Error(
      `Could not load schema.sql from ${SCHEMA_PATH}. ` +
      'Ensure schema.sql is copied to the dist/data/ directory during build.'
    );
  }
  db.exec(schema);
}

// --- Query helpers ---

const INSERT_CARD_SQL = `
  INSERT OR REPLACE INTO cards
  (id, card_id, name, mana_cost, type, card_set, set_name, player_class,
   rarity, attack, health, durability, armor, text, flavor, artist,
   collectible, elite, race, spell_school, keywords)
  VALUES
  (@id, @card_id, @name, @mana_cost, @type, @card_set, @set_name, @player_class,
   @rarity, @attack, @health, @durability, @armor, @text, @flavor, @artist,
   @collectible, @elite, @race, @spell_school, @keywords)
`;

/**
 * Insert a single card into the cards table.
 */
export function insertCard(db: Database.Database, card: CardRow): void {
  const stmt = db.prepare(INSERT_CARD_SQL);
  stmt.run(card);
}

/**
 * Insert multiple cards in batched transactions (500 per batch).
 */
export function insertCards(db: Database.Database, cards: CardRow[]): void {
  const stmt = db.prepare(INSERT_CARD_SQL);

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    const transaction = db.transaction((rows: CardRow[]) => {
      for (const row of rows) {
        stmt.run(row);
      }
    });
    transaction(batch);
  }
}

/**
 * Check if the cards table has any rows.
 */
export function hasExistingData(db: Database.Database): boolean {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number };
  return row.cnt > 0;
}

/**
 * Get all table names in the database (excluding internal SQLite tables).
 */
export function getTableNames(db: Database.Database): string[] {
  const rows = db.prepare(
    "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all() as Array<{ name: string }>;
  return rows.map(r => r.name);
}
