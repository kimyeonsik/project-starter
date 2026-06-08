// scripts/lib/bundle-engine.mjs
// adopt-existing-project 스킬에 self-contained 실행 엔진을 번들한다.
// install.mjs(신규 설치)와 update.mjs(갱신)가 공유 — 번들 파일 목록의 단일 원천.
//
// 레이아웃은 레포를 미러링한다:
//   <skillDir>/engine/scripts/adopt.mjs
//   <skillDir>/engine/scripts/lib/*.mjs
//   <skillDir>/engine/claude-rules/
//   <skillDir>/engine/package.json
// 덕분에 adopt.mjs 자체의 경로 해석(DEFAULT_SOURCE_ROOT 등)이 그대로 동작한다.

import fs from 'node:fs';
import path from 'node:path';
import { copyRecursive } from './util.mjs';

// adopt.mjs 가 import 하는 lib 파일들 (이게 곧 엔진 의존성 목록).
const ENGINE_LIB = ['stack-detect.mjs', 'gap-analysis.mjs', 'stack-signals.mjs', 'migration-readiness.mjs', 'vendor.mjs', 'util.mjs', 'registry.mjs'];

// repoDir 의 엔진을 <skillsDir>/adopt-existing-project/engine 으로 번들. 깨끗이 재빌드한다.
// adopt 스킬이 없으면 (false) 반환.
export function bundleAdoptEngine(skillsDir, repoDir) {
  const skillDir = path.join(skillsDir, 'adopt-existing-project');
  if (!fs.existsSync(skillDir)) return false;
  const engine = path.join(skillDir, 'engine');
  fs.rmSync(engine, { recursive: true, force: true });
  fs.mkdirSync(path.join(engine, 'scripts', 'lib'), { recursive: true });
  copyRecursive(path.join(repoDir, 'claude-rules'), path.join(engine, 'claude-rules'));
  fs.copyFileSync(path.join(repoDir, 'scripts', 'adopt.mjs'), path.join(engine, 'scripts', 'adopt.mjs'));
  for (const f of ENGINE_LIB) {
    fs.copyFileSync(path.join(repoDir, 'scripts', 'lib', f), path.join(engine, 'scripts', 'lib', f));
  }
  fs.copyFileSync(path.join(repoDir, 'package.json'), path.join(engine, 'package.json'));
  return true;
}
