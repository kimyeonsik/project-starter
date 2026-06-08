// scripts/lib/registry.mjs
// 프로젝트 전반에서 공유하는 단일 원천(SSOT) 목록.
// 한 곳에서 정의하고 install.mjs / vendor.mjs / stack-detect.mjs 가 import 한다.
// 마크다운·파일 사본(README, CLAUDE.md.template, capabilities/*.md 등)은
// consistency.test.mjs 가 이 목록과 일치하는지 CI에서 검증한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// package.json 의 version 을 단일 원천으로 노출 (모든 곳이 여기서 import).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

// 항상 설치/vendoring 되는 코어 규칙 (claude-rules/<lang>/ 에 존재).
export const CORE_RULES = [
  'language.md', 'agent-teams.md', 'skill-activation.md',
  'git-workflow.md', 'adr.md', 'security.md',
];

// generic 규칙이 있는 capability (claude-rules/capabilities/<cap>.md 와 1:1).
export const CAPABILITIES = [
  'framework', 'test-runner', 'database', 'error-tracking', 'analytics', 'styling',
  'auth', 'payments', 'hosting', 'email', 'ai',
];

// 외부 스킬 번들 (npx skills add 로 설치). 형식: "owner/repo@skill".
export const ESSENTIAL_SKILLS = [
  'obra/superpowers@brainstorming',
  'obra/superpowers@writing-plans',
  'obra/superpowers@test-driven-development',
  'obra/superpowers@systematic-debugging',
  'obra/superpowers@verification-before-completion',
  'obra/superpowers@requesting-code-review',
  'mattpocock/skills@grill-me',
  'vercel-labs/skills@find-skills',
  'anthropics/skills@frontend-design',
  'mattpocock/skills@improve-codebase-architecture',
  'github/awesome-copilot@refactor',
  'mattpocock/skills@request-refactor-plan',
];
export const WEB_SKILLS = [
  'vercel-labs/agent-skills@vercel-react-best-practices',
  'wshobson/agents@nextjs-app-router-patterns',
  'wshobson/agents@typescript-advanced-types',
  'anthropics/skills@webapp-testing',
  'addyosmani/web-quality-skills@accessibility',
];
export const SUPABASE_SKILLS = [
  'supabase/agent-skills@supabase',
  'supabase/agent-skills@supabase-postgres-best-practices',
];

// 모든 외부 스킬 평탄화 (consistency 검증 등에서 사용).
export const ALL_SKILLS = [...ESSENTIAL_SKILLS, ...WEB_SKILLS, ...SUPABASE_SKILLS];
