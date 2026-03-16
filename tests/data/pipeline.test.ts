import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadLastUpdate,
  saveLastUpdate,
  isFirstRun,
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
});
