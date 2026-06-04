#!/usr/bin/env node
// scripts/adopt.mjs
// 운영중 프로젝트 입양: 감지 → (모드별) vendor/검증 → 갭 리포트.
// 소스 코드를 절대 수정하지 않는다. Idempotent.
//
// 모드:
//   apply   (기본) 규칙 vendoring + CLAUDE.md 합성 + adopt-report.md 작성
//   dry-run        감지+갭만, 아무것도 안 씀 (read-only 점검)
//   verify         설치 상태 검증(예상 규칙 파일/관리블록 존재), 안 씀
//
// CLI: node scripts/adopt.mjs [--lang ko|en] [--dry-run] [--verify]
//      (대상 = cwd 또는 PROJECT_ROOT)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { info, ok, warn, err, hasManagedBlock } from './lib/util.mjs';
import { detectStacks } from './lib/stack-detect.mjs';
import { analyzeGaps, renderReport } from './lib/gap-analysis.mjs';
import { vendorRules, mergeClaudeMd, plannedRuleFiles } from './lib/vendor.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_ROOT = path.resolve(SCRIPT_DIR, '..');

// 설치 상태 검증 (read-only): 예상 규칙 파일 + CLAUDE.md 관리블록 존재 확인.
function verifyInstalled(repoDir, detected) {
  const claudeDir = path.join(repoDir, '.claude');
  const missing = [];
  for (const rel of plannedRuleFiles(detected)) {
    if (!fs.existsSync(path.join(claudeDir, rel))) missing.push(rel);
  }
  const claudeMd = path.join(repoDir, 'CLAUDE.md');
  const mdOk = fs.existsSync(claudeMd) && hasManagedBlock(fs.readFileSync(claudeMd, 'utf8'));
  if (!mdOk) missing.push('CLAUDE.md (managed block)');
  return { ok: missing.length === 0, missing };
}

export function runAdopt(repoDir, opts = {}) {
  const sourceRoot = opts.sourceRoot || DEFAULT_SOURCE_ROOT;
  const lang = opts.lang || 'en';
  const mode = opts.mode || 'apply';
  const stacksDir = path.join(sourceRoot, 'claude-rules', 'stacks');

  const detected = detectStacks(repoDir, { stacksDir });
  const gaps = analyzeGaps(repoDir, detected);
  const report = renderReport(gaps, detected);

  if (mode === 'dry-run') {
    return { mode, detected, gaps, report }; // read-only: 아무 파일도 안 씀
  }
  if (mode === 'verify') {
    return { mode, detected, gaps, report, verification: verifyInstalled(repoDir, detected) };
  }

  // apply (코드 비파괴 — .claude/ 와 CLAUDE.md 만 건드림)
  vendorRules(repoDir, sourceRoot, detected, lang);
  mergeClaudeMd(repoDir, detected);
  const reportPath = path.join(repoDir, '.claude', 'adopt-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  return { mode, detected, gaps, report, reportPath };
}

// ---- CLI ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT_DIR, 'adopt.mjs');
if (isMain) {
  const argv = process.argv.slice(2);
  const langIdx = argv.indexOf('--lang');
  const VALID_LANGS = new Set(['ko', 'en']);
  const langArg = langIdx >= 0 ? argv[langIdx + 1] : 'en';
  if (!VALID_LANGS.has(langArg)) {
    err(`Invalid --lang value: "${langArg}". Use ko or en.`);
    process.exit(1);
  }
  const lang = langArg;
  const mode = argv.includes('--dry-run') ? 'dry-run' : argv.includes('--verify') ? 'verify' : 'apply';
  const repoDir = process.env.PROJECT_ROOT || process.cwd();
  info(`Adopt (${mode}): ${repoDir}`);
  const res = runAdopt(repoDir, { lang, mode });
  if (mode === 'dry-run') {
    console.log('\n' + res.report);
    ok('Dry-run 완료 — 아무 파일도 변경하지 않았습니다.');
  } else if (mode === 'verify') {
    if (res.verification.ok) ok('Verify 통과 — 예상 규칙/관리블록 모두 존재.');
    else warn(`Verify 누락: ${res.verification.missing.join(', ')}`);
  } else {
    ok(`Detected ${res.detected.length} stack(s); rules vendored to ./.claude/rules/`);
    if (res.gaps.unsupportedStacks.length) {
      warn(`Generic-only stacks (no dedicated rule): ${res.gaps.unsupportedStacks.join(', ')}`);
    }
    ok(`Gap report: ${res.reportPath}`);
    console.log('\n소스 코드는 변경되지 않았습니다. 리포트의 제안은 승인 후 별도 진행하세요.');
  }
}
