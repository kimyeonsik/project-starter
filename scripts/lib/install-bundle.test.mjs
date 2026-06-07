// scripts/lib/install-bundle.test.mjs
// install.mjs 가 adopt-existing-project 스킬에 self-contained 엔진을 번들하고,
// 그 엔진이 클론과 무관하게 독립 실행되는지(=skill-driven adopt의 전제) 검증한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('install bundles a self-contained adopt engine that runs standalone', () => {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-install-'));
  try {
    // 비대화형(env로 모든 선택 지정) + 네트워크 없음(minimal) + prereq 생략.
    execFileSync('node', [path.join(ROOT, 'scripts', 'install.mjs')], {
      env: {
        ...process.env,
        SCOPE: 'project', PROJECT_ROOT: proj, LANG_CHOICE: 'en',
        SKILL_BUNDLE: 'minimal', SKIP_PREREQ: '1',
      },
      stdio: 'ignore',
    });

    const skillDir = path.join(proj, '.claude', 'skills', 'adopt-existing-project');
    const engine = path.join(skillDir, 'engine', 'scripts', 'adopt.mjs');
    assert.ok(fs.existsSync(engine), 'bundled engine adopt.mjs missing');
    assert.ok(
      fs.existsSync(path.join(skillDir, 'engine', 'claude-rules', 'stacks')),
      'bundled claude-rules missing'
    );

    // 번들 엔진이 독립 실행된다 (isMain realpath 수정 + 자급자족 증명).
    const ver = execFileSync('node', [engine, '--version'], { encoding: 'utf8' }).trim();
    const pkgVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
    assert.equal(ver, pkgVer);
  } finally {
    fs.rmSync(proj, { recursive: true, force: true });
  }
});
