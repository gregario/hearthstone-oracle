import { describe, it, expect } from 'vitest';

describe('server', () => {
  it('createServer is exported and callable', async () => {
    const { createServer } = await import('../src/server.js');
    expect(typeof createServer).toBe('function');
  });
});
