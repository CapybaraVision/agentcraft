import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as {
  dependencies: Record<string, string>;
  overrides?: Record<string, string>;
};
const lock = require('../package-lock.json') as {
  packages: Record<string, { version?: string }>;
};

/** Resolved versions from the 2026-11-08 Foreman audit fix (high 4, moderate 3 → 0). */
const RESOLVED = {
  zod: '4.6.7',
  '@modelcontextprotocol/sdk': '1.32.2',
  'body-parser': '2.4.0',
  'fast-uri': '3.1.9',
  'ip-address': '10.7.6',
  qs: '6.17.1',
  vite: '8.3.6',
} as const;

describe('patched dependency pins', () => {
  it('keeps the Claude SDK and locks the audited tree at the patched releases', () => {
    expect(pkg.dependencies['@anthropic-ai/claude-agent-sdk']).toBe('^0.3.286');
    expect(pkg.dependencies.zod).toBe('^4.6.6');
    expect(pkg.overrides).toBeUndefined();
    expect(lock.packages['node_modules/@anthropic-ai/claude-agent-sdk']?.version).toBe('0.3.286');
    for (const [name, version] of Object.entries(RESOLVED)) {
      expect(lock.packages[`node_modules/${name}`]?.version).toBe(version);
    }
  });
});
