#!/usr/bin/env node
// scripts/update.mjs
// 기존 project-starter 설치를 현재 체크아웃 버전으로 갱신한다.
// 매니페스트를 읽어 위치/스코프/언어를 파악하고, 프롬프트 없이 규칙 + 자체 스킬
// (+번들 adopt 엔진) + CLAUDE.md 관리 블록을 content-aware로 새로고침한다.
// 외부 스킬은 --skills 일 때만 (npx skills update).
//
// 사용 (project-starter 클론에서 git pull 후):
//   node scripts/update.mjs                 # cwd/스코프 자동 감지
//   SCOPE=global node scripts/update.mjs
//   node scripts/update.mjs --skills        # 외부 스킬도 갱신

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  info, ok, warn, err, exists, copyRecursive, isoUtc, which, runOk,
  stripManagedBlock, hasManagedBlock, wrapManagedBlock,
} from './lib/util.mjs';
import { CORE_RULES, VERSION } from './lib/registry.mjs';
import { bundleAdoptEngine } from './lib/bundle-engine.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(SCRIPT_DIR, '..');
const HOME = os.homedir();

// 내용이 같으면 건너뛰는 복사 (백업 churn 없음).
function copyIfChanged(src, dest) {
  if (exists(dest) && fs.readFileSync(src).equals(fs.readFileSync(dest))) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function manifestGet(text, key) {
  const l = text.split('\n').find((x) => x.startsWith(`${key}=`));
  return l ? l.slice(key.length + 1) : undefined;
}
function manifestSet(text, key, val) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${val}`;
  else {
    const at = lines.findIndex((l) => l.startsWith('version='));
    if (at >= 0) lines.splice(at + 1, 0, `${key}=${val}`);
    else lines.push(`${key}=${val}`);
  }
  return lines.join('\n');
}

// scope/env → 설치 위치 해석 (매니페스트 읽기). 못 찾으면 null.
export function resolveInstall(opts = {}) {
  const env = opts.env || process.env;
  let scope = opts.scope || env.SCOPE || '';
  const manifestFor = (s) => {
    const claudeDir = s === 'global'
      ? (env.CLAUDE_DIR || path.join(HOME, '.claude'))
      : path.join(env.PROJECT_ROOT || process.cwd(), '.claude');
    return path.join(claudeDir, '.project-starter-manifest');
  };
  if (!scope) {
    if (exists(manifestFor('project'))) scope = 'project';
    else if (exists(manifestFor('global'))) scope = 'global';
    else return null;
  }
  const manifestPath = manifestFor(scope);
  if (!exists(manifestPath)) return null;
  const text = fs.readFileSync(manifestPath, 'utf8');
  const claudeDir = path.dirname(manifestPath);
  return {
    scope,
    manifestPath,
    installedVersion: manifestGet(text, 'project_starter_version') || '(pre-0.2.0)',
    lang: opts.lang || env.LANG_CHOICE || manifestGet(text, 'lang') || 'en',
    rulesDir: manifestGet(text, 'rules_dir') || path.join(claudeDir, 'rules'),
    skillsDir: manifestGet(text, 'skills_dir'),
    commandsDir: path.join(claudeDir, 'commands'),
    claudeMd: manifestGet(text, 'claude_md_path') || path.join(claudeDir, '..', 'CLAUDE.md'),
    projectScope: scope === 'project',
  };
}

// 실제 갱신. 테스트는 명시 경로(inst)로 호출.
export function runUpdate(inst, opts = {}) {
  const repoDir = opts.repoDir || REPO_DIR;
  const { rulesDir, skillsDir, commandsDir, claudeMd, manifestPath, lang, projectScope } = inst;
  let changed = 0;

  // 규칙: 코어(언어별) + 모든 stacks
  fs.mkdirSync(path.join(rulesDir, 'stacks'), { recursive: true });
  for (const f of CORE_RULES) {
    if (copyIfChanged(path.join(repoDir, 'claude-rules', lang, f), path.join(rulesDir, f))) changed++;
  }
  const stacksSrc = path.join(repoDir, 'claude-rules', 'stacks');
  for (const f of fs.readdirSync(stacksSrc).filter((x) => x.endsWith('.md'))) {
    if (copyIfChanged(path.join(stacksSrc, f), path.join(rulesDir, 'stacks', f))) changed++;
  }

  // 자체 스킬: 전체 디렉터리 덮어쓰기 + adopt 엔진 재번들
  if (skillsDir) {
    fs.mkdirSync(skillsDir, { recursive: true });
    const skillsSrc = path.join(repoDir, 'skills');
    for (const e of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
      if (e.isDirectory()) copyRecursive(path.join(skillsSrc, e.name), path.join(skillsDir, e.name));
    }
    bundleAdoptEngine(skillsDir, repoDir);
  }

  // 슬래시 명령 새로고침 (content-aware)
  if (commandsDir) {
    const commandsSrc = path.join(repoDir, 'commands');
    if (exists(commandsSrc)) {
      fs.mkdirSync(commandsDir, { recursive: true });
      for (const f of fs.readdirSync(commandsSrc).filter((x) => x.endsWith('.md'))) {
        if (copyIfChanged(path.join(commandsSrc, f), path.join(commandsDir, f))) changed++;
      }
    }
  }

  // CLAUDE.md 관리 블록 갱신 (content-aware, 사용자 내용 보존)
  if (claudeMd && exists(claudeMd)) {
    let templateBody = fs.readFileSync(path.join(repoDir, 'CLAUDE.md.template'), 'utf8');
    if (projectScope) templateBody = templateBody.replaceAll('@~/.claude/rules', '@.claude/rules');
    const block = wrapManagedBlock(templateBody);
    const current = fs.readFileSync(claudeMd, 'utf8');
    let base = hasManagedBlock(current) ? stripManagedBlock(current) : current;
    base = base.replace(/\n+$/, '');
    const merged = base.length ? `${base}\n\n${block}` : block;
    if (merged !== current) { fs.writeFileSync(claudeMd, merged); changed++; }
  }

  // 매니페스트 버전/언어 갱신
  if (manifestPath && exists(manifestPath)) {
    let m = fs.readFileSync(manifestPath, 'utf8');
    m = manifestSet(m, 'project_starter_version', VERSION);
    m = manifestSet(m, 'lang', lang);
    m = manifestSet(m, 'updated_at', isoUtc());
    fs.writeFileSync(manifestPath, m);
  }

  return { changed };
}

// CHANGELOG에서 fromVer(미포함) 이후 ~ 최신까지 출력.
function printChangelogSince(fromVer) {
  const p = path.join(REPO_DIR, 'CHANGELOG.md');
  if (!exists(p)) return;
  const out = [];
  let printing = false;
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = l.match(/^## \[(\d+\.\d+\.\d+)\]/);
    if (m) { if (m[1] === fromVer) break; printing = true; }
    if (printing) out.push(l);
  }
  const body = out.join('\n').trim();
  if (body) { info("What's new:"); console.log('\n' + body + '\n'); }
}

// ---- CLI ----
const isMain = process.argv[1]
  && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes('--version')) { console.log(VERSION); process.exit(0); }

  const inst = resolveInstall();
  if (!inst) {
    err('No project-starter install found (.project-starter-manifest missing).');
    err('Pass SCOPE=global, or run from a project dir, or install first.');
    process.exit(1);
  }
  info(`project-starter update — ${inst.scope} scope`);
  info(`installed v${inst.installedVersion}  →  current v${VERSION}`);
  if (inst.installedVersion === VERSION) ok('Already at the latest version (refreshing content anyway).');
  else printChangelogSince(inst.installedVersion);

  const { changed } = runUpdate(inst);
  ok(`Refreshed rules + skills (${changed} file(s) changed); manifest now v${VERSION}.`);

  if (argv.includes('--skills')) {
    if (which('npx')) {
      info('Updating external skills (npx skills update)...');
      runOk('npx', ['--yes', 'skills', 'update']);
      ok('External skills updated.');
    } else {
      warn('npx not found; skipping external skill update.');
    }
  } else {
    info('External skills not touched. Re-run with --skills to also `npx skills update`.');
  }
}
