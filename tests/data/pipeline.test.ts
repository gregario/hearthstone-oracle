import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadLastUpdate,
  saveLastUpdate,
  isFirstRun,
  isStale,
} from '../../src/data/pipeline.js';

describe('Pipeline utilities', () => {
  let tmpDir: string;

  function makeTmpDir(): string {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-oracle-test-'));
    return tmpDir;
  }

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('loadLastUpdate returns empty object when file does not exist', () => {
    const dir = makeTmpDir();
    const result = loadLastUpdate(dir);
    expect(result).toEqual({});
  });

  it('saveLastUpdate + loadLastUpdate round-trips correctly', () => {
    const dir = makeTmpDir();
    const data = { hearthstone: '2025-03-15T12:00:00Z' };

    saveLastUpdate(data, dir);
    const loaded = loadLastUpdate(dir);

    expect(loaded).toEqual(data);
  });

  it('isFirstRun returns true when no hearthstone timestamp', () => {
    expect(isFirstRun({})).toBe(true);
    expect(isFirstRun({ hearthstone: undefined })).toBe(true);
  });

  it('isFirstRun returns false when hearthstone timestamp is present', () => {
    expect(isFirstRun({ hearthstone: '2025-03-15T12:00:00Z' })).toBe(false);
  });

  describe('isStale', () => {
    it('returns true when no timestamp is present', () => {
      expect(isStale({})).toBe(true);
      expect(isStale({ hearthstone: undefined })).toBe(true);
    });

    it('returns true for an unparseable timestamp', () => {
      expect(isStale({ hearthstone: 'not-a-date' })).toBe(true);
    });

    it('returns false for a fresh snapshot (within 7 days)', () => {
      const now = new Date('2026-04-26T12:00:00Z');
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(isStale({ hearthstone: twoDaysAgo.toISOString() }, now)).toBe(false);
    });

    it('returns true for a snapshot older than 7 days', () => {
      const now = new Date('2026-04-26T12:00:00Z');
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      expect(isStale({ hearthstone: eightDaysAgo.toISOString() }, now)).toBe(true);
    });

    it('respects a custom staleAfterMs threshold', () => {
      const now = new Date('2026-04-26T12:00:00Z');
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHour = 60 * 60 * 1000;
      expect(
        isStale({ hearthstone: oneDayAgo.toISOString() }, now, oneHour),
      ).toBe(true);
    });
  });
});
