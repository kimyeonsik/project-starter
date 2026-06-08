# Requirement-Driven, Framework-Pluggable Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신규 프로젝트가 요구사항 기반으로 framework+스택을 추천받고(greenfield), 공식 도구로 스캐폴드 후 adopt+install로 완성되게 한다 (스펙 `2026-06-09-...-bootstrap-design.md`).

**Architecture:** recommend-stack에 greenfield 모드(인터뷰 입력·framework 추천·호환성 의존순서)를 추가하고, new-project-bootstrap을 "추천→공식 스캐폴드→adopt→install" 흐름으로 재구성한다. Next.js는 프리셋 레시피 유지, 타 프레임워크는 install-stack add(generic). ADR/CLAUDE.md는 resolved 스택 기반 동적 생성. 거의 전부 SKILL.md(프롬프트) 변경 — 새 Node 코드 없음.

**Tech Stack:** Markdown 스킬 저작(한국어), 기존 엔진(adopt/install-stack/recommend) 재사용, consistency 가드.

> **구현 대상 레포:** `~/projects/project-starter`. 모든 경로 그 레포 기준.
> **선행 스펙:** [`../specs/2026-06-09-requirement-driven-framework-pluggable-bootstrap-design.md`](../specs/2026-06-09-requirement-driven-framework-pluggable-bootstrap-design.md)

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `skills/recommend-stack/SKILL.md` | existing/greenfield 모드, framework(greenfield), 호환성 의존순서 | 수정(핵심) |
| `skills/new-project-bootstrap/SKILL.md` | 추천→스캐폴드→adopt→install 흐름, 공식 스캐폴더 맵, Next 프리셋/타 generic, 동적 ADR/CLAUDE.md | 수정(핵심) |
| `skills/install-stack/SKILL.md` | bootstrap greenfield에서 add 재사용 1줄 | 소폭 |
| `package.json`/`CHANGELOG.md` | 0.9.0 → 0.10.0 | 수정 |
| `README.md`/`README.ko.md` + 다이어그램 | (작업 후) 전체 흐름 점검·섹션 재정렬/추가 | 별도 마무리(Task 7) |

새 Node 모듈 없음 → consistency 가드(버전/CHANGELOG)만 자동, 나머지는 도그푸딩.

---

## Phase 1 — recommend-stack greenfield

## Task 1: recommend-stack에 greenfield 모드 + framework + 호환성

**Files:** Modify `skills/recommend-stack/SKILL.md`

- [ ] **Step 1: frontmatter description 갱신**

FIND:
`description: Recommend which stacks/tools to ADD for a project's empty capabilities (analytics, error-tracking, auth, payments, email, database, ai, hosting), weighted by the project's profile (web/native/edge, hosting, region, budget). Use when the user asks "what should I use for X", "recommend an analytics/auth/payments tool", or wants suggestions for missing infrastructure. Only recommends for ABSENT capabilities — never proposes replacing what is already in use.`
REPLACE:
`description: Recommend which stacks/tools to ADD for empty capabilities, weighted by requirements (platform, region, budget) AND compatibility with the already-chosen stack. Two modes — existing (inspect a repo's empty capabilities) and greenfield (new project: take requirements from an interview, recommend the WHOLE stack including framework, resolved in dependency order). Use for "what should I use for X", new-project stack selection, or missing-infra suggestions. Only recommends for ABSENT capabilities — never replaces what is already in use. (Framework is recommended only in greenfield; in existing mode the framework is in-use and untouched.)`

- [ ] **Step 2: 모드 섹션 추가 (제목 `# Recommend Stack` 다음, 기존 인트로 문장 뒤에 삽입)**

기존 인트로(`비어 있는 capability에 **무엇을 도입할지** 추천한다...`) 다음 줄에 삽입:
```markdown

## 모드
- **existing** (기존 repo): `adopt --dry-run`(inspect)으로 **빈 capability + 프로필 + in-use 스택**을 얻어 추천. framework는 in-use라 추천 안 함. (기존 동작)
- **greenfield** (신규 프로젝트, repo 없음): inspect 대신 **인터뷰 입력**(앱설명·플랫폼·지역·예산·제약 + 채울 capability 집합)을 받아 **framework 포함 전체 스택**을 추천. new-project-bootstrap이 스캐폴드 전에 호출한다.

두 모드의 추천 코어(항상 리서치 + 신호 가중)는 공유한다. 아래 Step은 **existing 기준**이며, greenfield 차이는 각 Step에 표기.
```

- [ ] **Step 3: Step 1(결정론 입력)에 greenfield 분기 추가**

FIND (Step 1 본문 시작):
`먼저 \`inspect\`(read-only)를 돌려 **빈 capability + 프로필**을 얻는다`
그 문장이 포함된 Step 1 블록 끝(코드블록·"빈 게 없으면..." 줄 다음)에 한 단락 추가:
```markdown

**greenfield**: inspect 대상이 없다. 대신 호출자(bootstrap)가 넘긴 **인터뷰 입력**을 쓴다 — `{ appDesc, platform(web|native|edge), region, budget, constraints }` + **채울 capability 집합**(framework 포함, 신규는 보통 전부). 프로필은 인터뷰에서 직접 온다(platform 등).
```

- [ ] **Step 4: greenfield 해소 절차 섹션 추가 (Step 3 "항상 최신 리서치" 다음에 삽입)**

`### Step 3:` 블록 끝 다음에 새 섹션 삽입:
```markdown
### Step 3.5: greenfield — 의존순서·호환성 해소
신규는 capability를 독립적으로가 아니라 **의존 순서**로 해소하고, 각 단계는 *지금까지 확정된 스택*을 입력으로 궁합을 본다.

해소 순서:
```
framework  (플랫폼/요구사항 → 후보: web→Next/SvelteKit/Astro/Remix, native→Expo/RN, edge→…)
  → hosting · database   (커플링: CF→D1+Drizzle, Vercel→Supabase/Neon …)
  → auth                 (framework·db 궁합: Supabase db→Supabase Auth, SvelteKit→Lucia, Next→next-auth/Clerk)
  → analytics · error-tracking · email · payments · ai  (요구사항·평판; payments는 지역 신호 강함)
  → test-runner · ci     (표준 기본: Vitest+Playwright / GitHub Actions)
```

각 capability의 **신호 우선순위**:
1. **외부 신호** — 사용자 요구사항(지역·예산·플랫폼·앱설명). 최우선.
2. **내부 신호 = 호환성** — 이미 확정된 framework·capability와의 궁합.
3. **평판/성숙도** — 생태계·유지보수.
4. **author default** — 위 셋이 못 가릴 때만 타이브레이커.

**속도**: 외부·호환성 신호가 둘 다 없는 capability는 무거운 비교 리서치 없이 default를 가볍게(최신/deprecation만 확인) 적용. 신호 있는 것만 깊은 비교 리서치.

**default prior(타이브레이커용, web 기준)**: framework=Next.js, db/auth=Supabase, analytics=Amplitude, error-tracking=Sentry, hosting=Vercel, email=Resend, ai=claude-api, test=Vitest+Playwright, ci=GitHub Actions. (요구사항·궁합이 가리키면 이걸 덮어쓴다)
```

- [ ] **Step 5: Step 4(순위 추천) greenfield 출력 형태 한 줄 추가**

FIND:
`capability별 후보 2~3개를 **순위 + 한 줄 근거 + 가격대 + 출처 링크**로 제시. 1순위 + 대안. 결정은 사용자에게 맡긴다.`
그 뒤에 추가:
`\n- **greenfield**: 해소된 **전체 스택 한 벌**(capability별 pick + 근거[외부신호/궁합/평판/default] + 출처)을 제시하고, 사용자가 **전체 수락**(빠름) 또는 **항목별 조정**(그 capability만 대안 리서치)하게 한다.`

- [ ] **Step 6: 원칙 갱신**

FIND:
`- **빈 capability만** 추천. 이미 쓰는 건 안 건드림.`
REPLACE:
`- **빈 capability만** 추천. 이미 쓰는 건 안 건드림. (greenfield는 전부 비어있어 framework 포함 전체 추천; existing은 framework 제외.)`

FIND:
`- **결정은 사용자.** 우리는 근거 있는 선택지를 줄 뿐.`
REPLACE:
`- **호환성 우선.** 무신호 capability는 default가 아니라 **확정된 스택과의 궁합**으로 고르고, 정말 못 가릴 때만 default.
- **결정은 사용자.** 우리는 근거 있는 선택지를 줄 뿐.`

- [ ] **Step 7: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "greenfield|모드|의존 순서|호환성|framework" skills/recommend-stack/SKILL.md | head -20`
Expected: greenfield 모드·해소순서·호환성 반영. `node --test scripts/lib/consistency.test.mjs` → pass (외부 스킬 ID 무변경).
```bash
cd ~/projects/project-starter
git add skills/recommend-stack/SKILL.md
git commit -m "feat(recommend-stack): greenfield mode + framework + compatibility-ordered resolution"
```

---

## Phase 2 — bootstrap 가변 흐름

## Task 2: bootstrap frontmatter + 인터뷰(스택 해소) 

**Files:** Modify `skills/new-project-bootstrap/SKILL.md`

- [ ] **Step 1: frontmatter description 갱신**

FIND:
`description: Bootstrap a new Next.js + TypeScript + pnpm web project with Sentry, Amplitude, Supabase Auth, Vitest, Playwright, and GitHub Actions CI pre-configured. Use when the user wants to start a new web project from scratch and needs standardized infrastructure (analytics, crash reporting, testing, CI). Triggers after \`superpowers:brainstorming\` confirms project scope.`
REPLACE:
`description: Bootstrap a new project. Recommends a stack from the user's requirements (framework + db/auth/analytics/error-tracking/hosting/…) via recommend-stack (greenfield), scaffolds with the framework's official create tool, then applies governance (adopt) and installs capabilities. Next.js has a rich built-in preset; other frameworks (Vite/SvelteKit/Remix/Astro/Expo) use the generic install path. Use when starting a new project from scratch. Triggers after \`superpowers:brainstorming\` confirms project scope.`

- [ ] **Step 2: Required Decisions 표 갱신 — 스택 해소 항목 추가**

FIND the table row block:
`| Supabase 프로젝트 생성 | yes (MCP로 자동) | 기존 프로젝트 연결 가능 |`
REPLACE:
`| **스택 해소** | recommend-stack(greenfield) 추천 수락 | framework·db·auth·analytics 등 항목별 조정 가능 (Step 1.6) |
| 외부 프로젝트 생성(Supabase/Sentry 등) | yes (해당 스택 선택 시, MCP/위저드 자동) | 거절 시 SDK/설정만 |`

(나머지 행 — 프로젝트 이름/앱 설명/GitHub/Amplitude key — 유지)

- [ ] **Step 3: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "스택 해소|official create|framework" skills/new-project-bootstrap/SKILL.md | head`
```bash
cd ~/projects/project-starter
git add skills/new-project-bootstrap/SKILL.md
git commit -m "feat(bootstrap): frontmatter + stack-resolution interview row"
```

---

## Task 3: bootstrap 흐름 — 스택 해소·공식 스캐폴드·adopt·install

**Files:** Modify `skills/new-project-bootstrap/SKILL.md`

- [ ] **Step 1: Step 1(환경 확인) 다음에 "Step 1.6: 스택 해소" 삽입**

`### Step 1: 환경 확인` 블록 끝(베이스라인 태그/진행로그 코드 다음)에 새 섹션 삽입:
```markdown
### Step 1.6: 스택 해소 (요구사항 → 추천)

아직 코드가 없다(빈 디렉터리). 요구사항을 모아 **recommend-stack(greenfield)** 으로 스택을 정한다.

1. 인터뷰: `{ appDesc(필수), platform(web|native|edge), region, budget, constraints }`. (brainstorming 결과가 있으면 재사용)
2. `recommend-stack` 스킬을 **greenfield 모드**로 호출 — 채울 capability = 표준 기본셋(framework·db·auth·analytics·error-tracking·hosting·test-runner·ci) + 사용자가 원하는 추가(email·payments·ai).
3. 추천 스택 한 벌 제시 → 사용자 **전체 수락** 또는 **항목별 조정**.
4. 결과를 **resolved 스택**으로 확정: `{ framework, capability→stack }`. 이후 단계가 이걸 참조.

> resolved.framework 가 이후 스캐폴더를, resolved의 각 capability가 설치 방식을 결정한다.
```

- [ ] **Step 2: 기존 Step 2(Next 스캐폴드)를 공식 스캐폴더 맵으로 교체**

FIND:
`### Step 2: Next.js 스캐폴드

\`\`\`bash
pnpm create next-app@latest . \
  --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*" \
  --use-pnpm --skip-install
pnpm install
\`\`\`

\`--skip-install\` 후 명시적 \`pnpm install\`로 잠금 파일 안정화.`
REPLACE:
`### Step 2: 베이스 스캐폴드 (resolved.framework의 공식 도구)

resolved.framework에 맞는 **공식 create 도구**로 베이스를 만든다(프레임워크별 스캐폴딩은 재발명하지 않음):

| framework | 명령 |
|---|---|
| nextjs | \`pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --skip-install\` |
| vite | \`pnpm create vite@latest . --template react-ts\` |
| sveltekit | \`pnpm create svelte@latest .\` |
| remix | \`pnpm create remix@latest .\` |
| astro | \`pnpm create astro@latest .\` |
| expo | \`pnpm create expo-app@latest .\` |

그다음 \`pnpm install\`로 잠금 파일 안정화. 대화형 프롬프트가 막히면 사용자에게 안내.

> **Next.js**: 아래 Step 3~7의 풍부한 프리셋(Vitest/Playwright/Sentry/Amplitude/Supabase/CI)을 그대로 사용.
> **타 프레임워크**: Step 3~7 대신 **Step 7′(generic 설치)** 로 간다 — resolved의 각 capability를 \`install-stack\`(add)로 설치.`

- [ ] **Step 3: Step 7(Supabase 고정) 뒤에 "Step 7′: generic capability 설치" 삽입 + Step 5~7을 조건부로 표기**

`### Step 7: Supabase Auth + DB` 블록의 끝(`src/lib/supabase/...` 문장) 다음에 삽입:
```markdown

> **위 Step 5~7(Sentry/Amplitude/Supabase)은 Next.js 프리셋의 기본 레시피다.** resolved에서 해당 capability가 default가 아니면(예: db=Drizzle+D1, auth=Clerk) 그 Step의 기본 레시피 대신 **Step 7′**의 install-stack 경로로 설치한다.

### Step 7′: generic capability 설치 (타 프레임워크 / 비-default 선택)

Next 프리셋이 다루지 않는 capability(타 프레임워크 전체, 또는 Next에서 비-default 선택)는 **`install-stack` 스킬을 `add` 모드**로 설치한다. resolved의 각 capability에 대해:
- 해당 스택을 `install-stack`(add)로 설치(공식 문서 리서치 → 런북 → 단계 승인 → 검증). clean git 게이트는 Step 1의 git init으로 충족.
- 표준 기본셋(test-runner·error-tracking·analytics·db·auth·ci)은 프레임워크 불문 적용(설치만 generic).
- 설치 후 규칙 vendoring은 install-stack이 adopt 재실행으로 처리(Step 8.5와 중복 시 idempotent).
```

- [ ] **Step 4: Step 7과 Step 8 사이에 "Step 7.9: adopt(거버넌스)" 삽입**

`### Step 8: 디렉토리 구조` 앞에 삽입:
```markdown
### Step 7.9: adopt — 거버넌스 vendoring

스택이 깔렸으니 **adopt**으로 감지된 스택에 맞는 규칙을 `./.claude/rules/`에 vendoring하고 CLAUDE.md 관리블록을 만든다(프레임워크 무관, 비파괴):
```bash
PROJECT_ROOT="$(pwd)" node "<adopt-existing-project 스킬 디렉터리>/engine/scripts/adopt.mjs" --lang ko
```
named 규칙 없는 스택(예: sveltekit, clerk)은 capability generic으로 커버되고 리포트에 "전용 규칙 권장"으로 뜬다. (이게 신규/기존 공통 거버넌스 단계)
```

- [ ] **Step 5: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "Step 1.6|Step 2:|Step 7′|Step 7.9|공식 create|install-stack|adopt" skills/new-project-bootstrap/SKILL.md | head -20`
```bash
cd ~/projects/project-starter
git add skills/new-project-bootstrap/SKILL.md
git commit -m "feat(bootstrap): stack resolution + official scaffolder + generic install + adopt step"
```

---

## Task 4: bootstrap 동적 ADR / CLAUDE.md

**Files:** Modify `skills/new-project-bootstrap/SKILL.md`

- [ ] **Step 1: Step 8 ADR 0001 템플릿을 동적으로**

FIND the ADR decision block:
`## Decision
- Framework: Next.js 15 (App Router)
- Lang: TypeScript
- PM: pnpm
- DB/Auth: Supabase
- Analytics: Amplitude
- Crash: Sentry
- Unit: Vitest
- E2E: Playwright (Chromium)

## Rationale
사용자 표준 부트스트랩 스킬에 의해 결정. 변경 시 새 ADR 발행.`
REPLACE:
`## Decision
(resolved 스택을 그대로 기록 — 예시는 web 기본값)
- Framework: <resolved.framework>
- Lang: TypeScript
- PM: pnpm
- Database: <resolved.database>
- Auth: <resolved.auth>
- Analytics: <resolved.analytics>
- Crash: <resolved.error-tracking>
- Hosting: <resolved.hosting>
- Unit: <resolved.test-runner (default Vitest)>
- E2E: Playwright (Chromium)
- (선택) Email/Payments/AI: <resolved에 있으면>

## Rationale
recommend-stack(greenfield) 추천 + 사용자 확정. 신호 근거(요구사항/궁합)는 추천 리포트 참조. 변경 시 새 ADR 발행.`

- [ ] **Step 2: Step 9 프로젝트 CLAUDE.md를 동적으로**

FIND the CLAUDE.md import block:
`@~/.claude/rules/stacks/nextjs.md
@~/.claude/rules/stacks/supabase.md
@~/.claude/rules/stacks/vercel.md
@~/.claude/rules/stacks/playwright.md
@~/.claude/rules/stacks/vitest.md
@~/.claude/rules/stacks/sentry.md
@~/.claude/rules/stacks/amplitude.md
@~/.claude/rules/stacks/tailwind.md
@~/.claude/rules/stacks/github-actions.md
# Optional — uncomment as needed
# @~/.claude/rules/stacks/cloudflare.md
# @~/.claude/rules/stacks/claude-api.md
# @~/.claude/rules/stacks/resend.md`
REPLACE:
`(프로젝트 CLAUDE.md의 스택 import는 **adopt(Step 7.9)이 resolved 스택 기준으로 자동 생성**한다 — 손으로 고정 목록을 적지 않는다. import 경로는 project scope이므로 \`@.claude/rules/stacks/<resolved stack>.md\`. named 규칙 없는 스택은 adopt이 capability generic으로 커버하고 리포트에 권장 표기.)

예 (resolved = SvelteKit + Drizzle + D1 + Sentry):
\`\`\`
@.claude/rules/stacks/drizzle.md
@.claude/rules/stacks/d1.md
@.claude/rules/stacks/sentry.md
@.claude/rules/capabilities/framework.md   # sveltekit named 없음 → generic
\`\`\``

- [ ] **Step 3: Step 10 커밋 메시지 + ADR 참조 동적화 (고정 문구 정리)**

FIND:
`git commit -m "chore: initial bootstrap (Next.js + Supabase + Sentry + Amplitude + Vitest + Playwright)"`
REPLACE:
`git commit -m "chore: initial bootstrap (<resolved.framework> + resolved stack)"`

- [ ] **Step 4: install-stack에 bootstrap 재사용 1줄 (별 파일)**

`skills/install-stack/SKILL.md`의 "When to Use" 목록에 한 줄 추가 (FIND the `- stack-assess가 **교체를 risk=low...` line, add after it):
`- new-project-bootstrap이 신규 프로젝트의 capability 설치에 \`add\` 모드로 호출(greenfield, clean git는 부트스트랩 git init으로 충족)`

- [ ] **Step 5: 확인 + 커밋**

Run: `cd ~/projects/project-starter && grep -nE "resolved|adopt.*생성|<resolved" skills/new-project-bootstrap/SKILL.md | head && grep -n "new-project-bootstrap" skills/install-stack/SKILL.md`
```bash
cd ~/projects/project-starter
git add skills/new-project-bootstrap/SKILL.md skills/install-stack/SKILL.md
git commit -m "feat(bootstrap): dynamic ADR/CLAUDE.md from resolved stack; install-stack reuse note"
```

---

## Phase 3 — 버전 + 검증

## Task 5: 0.9.0 → 0.10.0 + CHANGELOG

**Files:** Modify `package.json`, `CHANGELOG.md`

- [ ] **Step 1: version** — `"version": "0.9.0",` → `"version": "0.10.0",`

- [ ] **Step 2: CHANGELOG 최상단(`## [0.9.0]` 위) 삽입**
```markdown
## [0.10.0] - 2026-06-09

### Added
- **Requirement-driven, framework-pluggable new projects.** `new-project-bootstrap`
  no longer hardcodes Next.js + Supabase. It now: gathers requirements → calls
  `recommend-stack` (new **greenfield mode**) to recommend the whole stack incl.
  **framework**, resolved in dependency order weighted by external signals →
  compatibility with the chosen stack → reputation → default → scaffolds with the
  framework's **official create tool** (Next/Vite/SvelteKit/Remix/Astro/Expo) →
  applies governance via `adopt` → installs capabilities (Next.js preset recipes,
  or `install-stack add` for other frameworks / non-default picks).
- **recommend-stack greenfield mode**: requirement-driven, recommends framework
  (greenfield only), compatibility-ordered. Existing mode unchanged.
- **Dynamic ADR/CLAUDE.md** reflecting the resolved stack (via adopt), replacing the
  fixed Supabase block.

### Notes
- Framework choice applies to new projects; existing projects were already
  framework-agnostic via adopt's generic capability rules. Non-Next frameworks use
  the generic install path (no bespoke preset yet). Data migration / non-interactive
  bootstrap remain out of scope.
```

- [ ] **Step 3: 전체 테스트** — `cd ~/projects/project-starter && node --test` → ALL pass, fail 0 (CHANGELOG===version).

- [ ] **Step 4: 커밋**
```bash
cd ~/projects/project-starter
git add package.json CHANGELOG.md
git commit -m "chore: 0.9.0 → 0.10.0 (requirement-driven framework-pluggable bootstrap)"
```

---

## Task 6: 도그푸딩 검증 (수동, AI 흐름)

**Files:** (검증만)

- [ ] **Step 1: 회귀 — Next 기본 수락**
빈 scratch dir에서 bootstrap 절차를 따라: 인터뷰(web, 특별요구 없음) → recommend greenfield가 **기본값(Next+Supabase+Sentry+Amplitude+Vitest/Playwright+Vercel)** 추천 → 전체 수락 → 흐름이 **현행 부트스트랩과 동등**한지 확인(공식 create-next-app, 프리셋 레시피, ADR/CLAUDE.md = Next/Supabase).

- [ ] **Step 2: 외부신호 — web/한국/저가**
인터뷰(web/한국/저가) → recommend가 **payments=Toss(외부신호)**, 그 외 궁합/default 반영하는지(추천 리포트의 근거 표기 확인).

- [ ] **Step 3: framework 가변 — SvelteKit**
인터뷰에서 SvelteKit 선택 시: Step 2가 **`create svelte`** 를 쓰고, Step 7′가 capability를 install-stack add로, Step 7.9 adopt이 sveltekit을 **framework generic**으로 커버 + ADR/CLAUDE.md가 SvelteKit 반영하는지.

- [ ] **Step 4: 궁합 — hosting=CF 먼저**
인터뷰에서 hosting=Cloudflare 신호 → db가 **D1+Drizzle**(궁합)로 해소되는지(무신호 default Supabase 아님).

- [ ] **Step 5: 요약** — (a) Next 회귀 (b) 외부신호(Toss) (c) framework 가변(SvelteKit) (d) 궁합(CF→D1) 확인 기록.

---

## Self-Review

**Spec coverage:**
- §3.2 greenfield 모드 + framework + 호환성 의존순서 → Task 1 ✅
- §3.3 공식 스캐폴더 맵 / Next 프리셋·타 generic / 공통 기본셋 → Task 3 ✅
- §3.1 단일 파이프라인(추천→스캐폴드→adopt→install) → Task 3(Step 1.6/2/7′/7.9) ✅
- §3.4 동적 ADR/CLAUDE.md → Task 4 ✅
- §6 에러(추천 폴백·named 없는 framework generic) → Task 1 default 타이브레이커 + Task 3/4 generic ✅
- §7 테스트(회귀·외부신호·framework가변·궁합) → Task 6 ✅
- §10 작업 후(크로스리뷰·README 전체점검) → Execution Handoff에 명시(Task 7)
- 비목표(bespoke 프리셋·데이터 마이그레이션) → 코드/스텝에 없음 ✅

**Placeholder scan:** `<resolved.x>`/`<adopt-existing-project 스킬 디렉터리>`는 실행시 치환 토큰(스킬이 명시적으로 치환 지시) — 플레이스홀더 아님. 그 외 구체 본문.

**Type/이름 일관성:** 모드 `existing|greenfield`, resolved 스택 표기, Step 번호(1.6/2/7′/7.9/8/9), 신호 우선순위(외부→호환성→평판→default) — Task 전반 일관.

---

## Execution Handoff (작업 후 마무리 — 스펙 §10)
구현 완료 후 **두 가지를 별도로** 수행한다:
- **Task 7 (크로스 리뷰)**: 전체 변경(recommend/bootstrap/install) 크로스 리뷰 1회.
- **Task 8 (README 전체 점검·갱신)**: 신규 흐름을 반영해 README(en/ko)를 **단순 문구가 아니라 전체 흐름 관점에서** — 섹션 순서 변경·추가·수정까지 — 점검하고 갱신. 다이어그램도 신규 파이프라인(추천→공식스캐폴드→adopt→install, framework 가변)에 맞게.
