import fs from 'node:fs';
import path from 'node:path';

import { contrast } from '@/lib/tone';
import { buildTokens, mix, tokenVars } from '@/theme/palette';

/**
 * The soft plum fill (round header actions, status pills, a chosen tile) and the type drawn on it.
 * A tenth of the accent all but vanishes on a dark card, so dark takes more, and its type is pushed
 * until it reads there.
 */

describe.each(['light', 'dark'] as const)('the tint in %s', (scheme) => {
  const tokens = buildTokens(scheme);

  it('carries type that reads on it', () => {
    expect(contrast(tokens.tintInk, tokens.tint)).toBeGreaterThanOrEqual(4.5);
  });

  it('carries type that reads on the bare card too, for an outlined pill', () => {
    expect(contrast(tokens.tintInk, tokens.card)).toBeGreaterThanOrEqual(4.5);
  });
});

it('stands further off the page in dark than a tenth of the accent did', () => {
  const dark = buildTokens('dark');
  const tenth = mix(dark.card, dark.accent, 0.1);
  expect(contrast(dark.tint, dark.surface)).toBeGreaterThan(contrast(tenth, dark.surface));
});

it('seeds the first frame with the light values', () => {
  const css = fs.readFileSync(path.join(__dirname, '../global.css'), 'utf8');
  const vars = tokenVars(buildTokens('light'));
  for (const name of ['--color-tint', '--color-tint-ink']) {
    expect(css).toContain(`${name}: ${vars[name]};`);
  }
});
