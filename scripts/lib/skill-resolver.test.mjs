// Tests for the self-healing skill resolver.
// When `npx skills add owner/repo --skill X` fails (repo moved/renamed),
// we query `npx skills find X` and pick the canonical new home by exact
// name match, ranked by install count. Pure parser → unit-testable.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMovedSkill, parseInstalls } from './skill-resolver.mjs';

// Realistic `npx skills find` output (already common shape; ANSI optional).
const FIND_OUTPUT = `
Install with npx skills add <owner/repo@skill>

vercel-labs/agent-skills@vercel-react-best-practices 459.3K installs
└ https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices

vercel-labs/claude-skills@vercel-react-best-practices 287 installs
└ https://skills.sh/vercel-labs/claude-skills/vercel-react-best-practices

akillness/oh-my-skills@vercel-react-best-practices 280 installs
└ https://skills.sh/akillness/oh-my-skills/vercel-react-best-practices
`;

test('parseInstalls handles plain / K / M / + suffixes', () => {
  assert.equal(parseInstalls('287'), 287);
  assert.equal(parseInstalls('1.9K'), 1900);
  assert.equal(parseInstalls('459.3K'), 459300);
  assert.equal(parseInstalls('1.2M'), 1200000);
  assert.equal(parseInstalls('100K+'), 100000);
});

test('picks the exact-name match with the most installs (canonical home)', () => {
  assert.equal(
    resolveMovedSkill('vercel-react-best-practices', FIND_OUTPUT),
    'vercel-labs/agent-skills',
  );
});

test('ranks by install count, not by output order', () => {
  const out = [
    'small/repo@foo 900 installs',
    'big/repo@foo 1.2M installs',
    'mid/repo@foo 5K installs',
  ].join('\n');
  assert.equal(resolveMovedSkill('foo', out), 'big/repo');
});

test('requires EXACT skill-name match — ignores fuzzy/folder-name hits', () => {
  // skills.sh indexes by SKILL.md `name:`; a different skill name must not match
  // even if it looks related (e.g. folder `react-best-practices`).
  const out = [
    'someone/mirror@react-best-practices 999K installs',
    'other/repo@react-view-transitions 10K installs',
  ].join('\n');
  assert.equal(resolveMovedSkill('vercel-react-best-practices', out), null);
});

test('strips ANSI color codes before parsing', () => {
  const ansi =
    '\x1b[38;5;145mvercel-labs/agent-skills@vercel-react-best-practices\x1b[0m ' +
    '\x1b[36m459.3K installs\x1b[0m';
  assert.equal(
    resolveMovedSkill('vercel-react-best-practices', ansi),
    'vercel-labs/agent-skills',
  );
});

test('exclude: never suggests the already-failed owner/repo', () => {
  // The dead repo rarely reappears, but a mirror might list the old path.
  const out = [
    'vercel-labs/skills@find-skills 500K installs', // unrelated name
    'vercel-labs/skills@vercel-react-best-practices 999K installs', // the dead one
    'vercel-labs/agent-skills@vercel-react-best-practices 459.3K installs',
  ].join('\n');
  assert.equal(
    resolveMovedSkill('vercel-react-best-practices', out, {
      exclude: 'vercel-labs/skills',
    }),
    'vercel-labs/agent-skills',
  );
});

test('returns null on empty / no-match output', () => {
  assert.equal(resolveMovedSkill('anything', ''), null);
  assert.equal(resolveMovedSkill('anything', 'No skills found.'), null);
});
