// scripts/lib/vendor.mjs
// 감지 기반 selective vendoring. install.mjs 와 동일한 util 헬퍼를 재사용한다.

import fs from 'node:fs';
import path from 'node:path';
import {
  exists, backupIfExists, stripManagedBlock, hasManagedBlock, wrapManagedBlock, timestamp,
} from './util.mjs';

// generic 규칙이 존재하는 capability (capabilities/*.md 와 일치해야 함)
const GENERIC_CAPS = new Set([
  'framework', 'test-runner', 'database', 'error-tracking', 'analytics', 'styling',
  'auth', 'payments', 'hosting', 'email', 'ai',
]);

// generic capability 규칙은 "해당 capability에 named 없는(=generic/unclassified) 스택이
// 하나라도 있을 때만" 설치한다 (Tier1 fallback floor). named로 완전히 덮인 capability는 생략.
// 예: database에 drizzle(named)+prisma(generic) → database.md 설치(prisma 바닥); hosting에 cloudflare(named)뿐 → 생략.
function capabilityFiles(detected) {
  const caps = new Set();
  for (const d of detected) {
    if ((d.ruleStatus === 'generic' || d.ruleStatus === 'unclassified') && GENERIC_CAPS.has(d.capability)) {
      caps.add(d.capability);
    }
  }
  return [...caps].map((c) => `${c}.md`);
}

// src 존재 여부를 먼저 확인하고 복사. 잘못된 sourceRoot에 대한 명확한 오류를 제공한다.
function copyRule(src, dest, TS) {
  if (!exists(src)) {
    throw new Error(`vendor: source rule file not found: ${src}`);
  }
  backupIfExists(dest, TS);
  fs.copyFileSync(src, dest);
}

// 감지된 named 스택 → 설치할 stacks 규칙 파일명
function namedStackFiles(detected) {
  return detected.filter((d) => d.ruleStatus === 'named').map((d) => `${d.stack}.md`);
}

// CLAUDE.md managed block 본문 생성 (project scope 상대경로 @.claude/rules/...)
export function buildManagedBody(detected) {
  const lines = [];
  lines.push('# Global Rules (managed by project-starter)');
  lines.push('');
  lines.push('@.claude/rules/language.md');
  lines.push('@.claude/rules/agent-teams.md');
  lines.push('@.claude/rules/skill-activation.md');
  lines.push('');
  const caps = capabilityFiles(detected);
  if (caps.length) {
    lines.push('## Capabilities (generic fallback)');
    lines.push('');
    for (const f of caps) lines.push(`@.claude/rules/capabilities/${f}`);
    lines.push('');
  }
  const named = namedStackFiles(detected);
  if (named.length) {
    lines.push('## Stacks (detected)');
    lines.push('');
    for (const f of named) lines.push(`@.claude/rules/stacks/${f}`);
    lines.push('');
  }
  return lines.join('\n');
}

// 규칙 파일을 대상 repo의 ./.claude/rules/ 로 복사 (selective).
// repoDir: 대상, sourceRoot: project-starter 레포 루트, lang: 'en'|'ko'
export function vendorRules(repoDir, sourceRoot, detected, lang = 'en') {
  const TS = timestamp();
  const rulesDir = path.join(repoDir, '.claude', 'rules');
  fs.mkdirSync(path.join(rulesDir, 'stacks'), { recursive: true });
  fs.mkdirSync(path.join(rulesDir, 'capabilities'), { recursive: true });

  // core 3종 (언어별)
  for (const f of ['language.md', 'agent-teams.md', 'skill-activation.md']) {
    const src = path.join(sourceRoot, 'claude-rules', lang, f);
    const dest = path.join(rulesDir, f);
    copyRule(src, dest, TS);
  }
  // capability generic 규칙 (감지된 것만)
  for (const f of capabilityFiles(detected)) {
    const src = path.join(sourceRoot, 'claude-rules', 'capabilities', f);
    const dest = path.join(rulesDir, 'capabilities', f);
    copyRule(src, dest, TS);
  }
  // named 스택 규칙 (감지된 것만)
  for (const f of namedStackFiles(detected)) {
    const src = path.join(sourceRoot, 'claude-rules', 'stacks', f);
    const dest = path.join(rulesDir, 'stacks', f);
    copyRule(src, dest, TS);
  }
  return { rulesDir };
}

// 이 detected에 대해 vendorRules가 설치할 규칙 파일들의 상대경로(.claude/ 기준).
// verify 모드가 "설치돼 있어야 할 파일"을 동일 로직으로 재사용하기 위해 export.
export function plannedRuleFiles(detected) {
  const files = ['rules/language.md', 'rules/agent-teams.md', 'rules/skill-activation.md'];
  for (const f of capabilityFiles(detected)) files.push(`rules/capabilities/${f}`);
  for (const f of namedStackFiles(detected)) files.push(`rules/stacks/${f}`);
  return files;
}

// CLAUDE.md 에 managed block 합성/갱신 (idempotent). 기존 사용자 내용 보존.
export function mergeClaudeMd(repoDir, detected) {
  const TS = timestamp();
  const claudeMd = path.join(repoDir, 'CLAUDE.md');
  const block = wrapManagedBlock(buildManagedBody(detected));
  if (exists(claudeMd)) {
    backupIfExists(claudeMd, TS);
    let content = fs.readFileSync(claudeMd, 'utf8');
    if (hasManagedBlock(content)) content = stripManagedBlock(content);
    content = content.replace(/\n+$/, '');
    fs.writeFileSync(claudeMd, content.length ? `${content}\n\n${block}` : block);
  } else {
    fs.writeFileSync(claudeMd, block);
  }
  return { claudeMd };
}
