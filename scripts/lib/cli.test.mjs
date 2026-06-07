// scripts/lib/cli.test.mjs
// 통합 CLI 디스패처가 버전/도움말/라우팅/에러를 올바로 처리하는지.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI = path.join(ROOT, 'scripts', 'cli.mjs');
const PKG_VER = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const created = [];
after(() => { for (const d of created) fs.rmSync(d, { recursive: true, force: true }); });

test('cli version prints the package version', () => {
  assert.equal(execFileSync('node', [CLI, 'version'], { encoding: 'utf8' }).trim(), PKG_VER);
});

test('cli help shows usage', () => {
  assert.match(execFileSync('node', [CLI, 'help'], { encoding: 'utf8' }), /Usage: project-starter/);
});

test('cli inspect routes to adopt --dry-run (read-only)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-cli-'));
  created.push(dir);
  fs.writeFileSync(path.join(dir, 'package.json'), '{"dependencies":{"next":"15"}}');
  const out = execFileSync('node', [CLI, 'inspect'], {
    encoding: 'utf8', env: { ...process.env, PROJECT_ROOT: dir },
  });
  assert.match(out, /adopt \(dry-run\)/);
  assert.ok(!fs.existsSync(path.join(dir, '.claude')), 'inspect must not write');
});

test('cli unknown command exits non-zero', () => {
  assert.throws(() => execFileSync('node', [CLI, 'bogus'], { stdio: 'pipe' }));
});
