// scripts/lib/gap-analysis.mjs
// 거버넌스 갭 진단 — 읽기 전용. 대상 repo를 절대 수정하지 않는다.

import fs from 'node:fs';
import path from 'node:path';

// 표준 거버넌스 산출물 체크리스트.
const GOVERNANCE = [
  { key: '_team/', kind: 'dir' },
  { key: 'docs/adr/', kind: 'dir' },
  { key: 'CLAUDE.md', kind: 'file' },
  { key: 'CONTEXT.md', kind: 'file' },
];

function existsRel(repoDir, rel) {
  try {
    fs.lstatSync(path.join(repoDir, rel.replace(/\/$/, '')));
    return true;
  } catch {
    return false;
  }
}

export function analyzeGaps(repoDir, detected) {
  const missing = GOVERNANCE.filter((g) => !existsRel(repoDir, g.key)).map((g) => g.key);
  const unsupportedStacks = detected
    .filter((d) => d.ruleStatus === 'generic' || d.ruleStatus === 'unclassified')
    .map((d) => d.stack);
  return { missing, unsupportedStacks };
}

export function renderReport(gaps, detected) {
  const lines = [];
  lines.push('# project-starter 입양 리포트');
  lines.push('');
  lines.push('> 이 리포트는 진단 결과다. **코드는 변경되지 않았다.** 아래 제안은 사용자 승인 후 별도로 진행한다.');
  lines.push('');
  lines.push('## 감지된 스택');
  lines.push('');
  lines.push('| 스택 | capability | 규칙 |');
  lines.push('|---|---|---|');
  for (const d of detected) {
    const mark = d.ruleStatus === 'named' ? '✅ named' : d.ruleStatus === 'generic' ? '⚠️ generic' : '❓ unclassified';
    lines.push(`| ${d.stack} | ${d.capability} | ${mark} |`);
  }
  lines.push('');
  if (gaps.unsupportedStacks.length) {
    lines.push('## ⚠️ 전용 규칙 없는 스택 (generic으로 커버 중)');
    lines.push('');
    for (const s of gaps.unsupportedStacks) {
      lines.push(`- **${s}** — capability generic 규칙으로 동작 중. 정교화하려면 \`claude-rules/stacks/${s}.md\` 추가 권장.`);
    }
    lines.push('');
  }
  if (gaps.missing.length) {
    lines.push('## 누락된 거버넌스 산출물 (제안)');
    lines.push('');
    for (const m of gaps.missing) {
      lines.push(`- \`${m}\` 없음 — 추가 권장 (적용은 승인 후 별건).`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
