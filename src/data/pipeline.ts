import type Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { hasExistingData } from './db.js';
import { fetchCards, ingestCards } from './hearthstone.js';

// --- Types ---

export interface LastUpdate {
  hearthstone?: string;
}

export interface PipelineOptions {
  force?: boolean;
  dataDir?: string;
  fetchFn?: typeof fetch;
}

// --- Constants ---

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.hearthstone-oracle');
const LAST_UPDATE_FILENAME = 'last_update.json';

/**
 * How long a snapshot stays "fresh" before the pipeline auto-refreshes it.
 * HearthstoneJSON publishes new builds whenever Blizzard ships a card update
 * (typically every few weeks during a release cycle). One week is a safe
 * default — frequent enough to pick up new expansions, infrequent enough to
 * avoid hammering the upstream CDN on every server start.
 */
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Returns true if the cached snapshot is older than STALE_AFTER_MS.
 * Exported for testing.
 */
export function isStale(
  lastUpdate: LastUpdate,
  now: Date = new Date(),
  staleAfterMs: number = STALE_AFTER_MS,
): boolean {
  if (!lastUpdate.hearthstone) return true;
  const last = new Date(lastUpdate.hearthstone).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last > staleAfterMs;
}

// --- Last update management ---

/**
 * Load last_update.json from the data directory.
 * Returns an empty object if the file does not exist.
 */
export function loadLastUpdate(dataDir?: string): LastUpdate {
  const dir = dataDir ?? DEFAULT_DATA_DIR;
  const filePath = path.join(dir, LAST_UPDATE_FILENAME);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as LastUpdate;
  } catch {
    return {};
  }
}

/**
 * Save last_update.json to the data directory.
 */
export function saveLastUpdate(
  lastUpdate: LastUpdate,
  dataDir?: string
): void {
  const dir = dataDir ?? DEFAULT_DATA_DIR;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, LAST_UPDATE_FILENAME);
  fs.writeFileSync(filePath, JSON.stringify(lastUpdate, null, 2), 'utf-8');
}

/**
 * Returns true if no hearthstone data has ever been fetched.
 */
export function isFirstRun(lastUpdate: LastUpdate): boolean {
  return !lastUpdate.hearthstone;
}

// --- Pipeline orchestration ---

/**
 * Run the data pipeline: fetch cards from HearthstoneJSON and ingest into DB.
 *
 * Logic:
 * 1. Load last_update.json
 * 2. If we have data and not forced refresh, skip fetch (return existing count)
 * 3. Otherwise fetch cards, clear existing data, re-ingest
 * 4. On failure: if first run and no data, throw. Otherwise graceful degradation
 * 5. Save updated timestamp
 *
 * @returns Number of cards in the database after pipeline completes
 */
export async function runPipeline(
  db: Database.Database,
  options?: PipelineOptions
): Promise<number> {
  const dataDir = options?.dataDir ?? DEFAULT_DATA_DIR;
  const force = options?.force ?? false;
  const fetchFn = options?.fetchFn;

  const lastUpdate = loadLastUpdate(dataDir);
  const existingData = hasExistingData(db);
  const stale = isStale(lastUpdate);

  // If we have fresh data and not forced, skip fetch.
  // Stale data triggers a refresh so newer expansions are picked up
  // (avoids "Unknown Card" results in decode_deck for recent dbfIds).
  if (existingData && !force && !isFirstRun(lastUpdate) && !stale) {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as {
      cnt: number;
    };
    console.error(
      `Skipping fetch — ${row.cnt} cards already loaded (last update: ${lastUpdate.hearthstone})`
    );
    return row.cnt;
  }

  if (existingData && stale && !force) {
    const ageDescription = lastUpdate.hearthstone
      ? `last update: ${lastUpdate.hearthstone}`
      : 'no last_update.json found';
    console.error(
      `Cached snapshot is stale (${ageDescription}); refreshing from HearthstoneJSON...`,
    );
  }

  try {
    const cards = await fetchCards(fetchFn);

    // Clear existing data before re-ingestion
    db.exec('DELETE FROM cards');

    ingestCards(db, cards);

    // Save timestamp
    lastUpdate.hearthstone = new Date().toISOString();
    saveLastUpdate(lastUpdate, dataDir);

    const row = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as {
      cnt: number;
    };
    console.error(`Pipeline complete: ${row.cnt} cards ingested`);
    return row.cnt;
  } catch (error) {
    if (!existingData) {
      // First run with no cached data — fatal
      throw error;
    }

    // Graceful degradation — use cached data
    console.error(
      `Failed to fetch cards, using cached data: ${error instanceof Error ? error.message : String(error)}`
    );
    const row = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as {
      cnt: number;
    };
    return row.cnt;
  }
}
