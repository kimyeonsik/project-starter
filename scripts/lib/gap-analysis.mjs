// scripts/lib/gap-analysis.mjs
// 거버넌스 갭 진단 — 읽기 전용. 대상 repo를 절대 수정하지 않는다.

import fs from 'node:fs';
import path from 'node:path';

// 표준 거버넌스 산출물 체크리스트.
const GOVERNANCE = ['_team/', 'docs/adr/', 'CLAUDE.md', 'CONTEXT.md'];

function existsRel(repoDir, rel) {
  try {
    fs.lstatSync(path.join(repoDir, rel.replace(/\/$/, '')));
    return true;
  } catch {
    return false;
  }
}

// 스택 추천이 의미 있는 capability (구조적인 framework/styling 제외).
const RECOMMENDABLE_CAPS = [
  'analytics', 'error-tracking', 'auth', 'payments', 'email',
  'database', 'test-runner', 'ai', 'hosting',
];

// 결정론 프로필 — 감지된 스택만으로 플랫폼/호스팅 추론 (토큰 0). /recommend 의 입력.
export function profile(detected) {
  const stacks = new Set(detected.map((d) => d.stack));
  const caps = new Set(detected.map((d) => d.capability));
  let platform = 'unknown';
  if (stacks.has('expo') || stacks.has('react-native')) platform = 'native';
  else if (stacks.has('cloudflare') || stacks.has('d1')) platform = 'edge';
  else if (caps.has('framework')) platform = 'web';
  const hostingStack = detected.find((d) => d.capability === 'hosting');
  return { platform, hosting: hostingStack ? hostingStack.stack : 'unknown' };
}

// 비어 있는(추천 후보) capability = RECOMMENDABLE − 현재 보유.
export function absentCapabilities(detected) {
  const present = new Set(detected.map((d) => d.capability));
  return RECOMMENDABLE_CAPS.filter((c) => !present.has(c));
}

export function analyzeGaps(repoDir, detected) {
  const missing = GOVERNANCE.filter((rel) => !existsRel(repoDir, rel));
  const unsupportedStacks = detected
    .filter((d) => d.ruleStatus === 'generic' || d.ruleStatus === 'unclassified')
    .map((d) => d.stack);
  return {
    missing,
    unsupportedStacks,
    profile: profile(detected),
    absentCapabilities: absentCapabilities(detected),
  };
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
  if (gaps.profile) {
    lines.push(`**프로필**: platform=${gaps.profile.platform} · hosting=${gaps.profile.hosting}`);
    lines.push('');
  }
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
  if (gaps.absentCapabilities && gaps.absentCapabilities.length) {
    lines.push('## 빈 capability (스택 추천 후보)');
    lines.push('');
    lines.push('아래 capability엔 도구가 없습니다 — `/recommend` 로 프로젝트 특성에 맞는 스택을 추천받으세요. (이미 쓰는 capability는 추천 대상이 아닙니다.)');
    lines.push('');
    for (const c of gaps.absentCapabilities) lines.push(`- ${c}`);
    lines.push('');
  }
  return lines.join('\n');
}
