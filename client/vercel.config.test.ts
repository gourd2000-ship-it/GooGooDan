import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('Vercel rewrites SPA deep links to index.html', () => {
  const config = JSON.parse(readFileSync(resolve(import.meta.dirname, 'vercel.json'), 'utf8'));

  expect(config.rewrites).toContainEqual({
    source: '/(.*)',
    destination: '/index.html',
  });
});
