---
name: new-project-bootstrap
description: Bootstrap a new project. Recommends a stack from the user's requirements (framework + db/auth/analytics/error-tracking/hosting/…) via recommend-stack (greenfield), scaffolds with the framework's official create tool, then applies governance (adopt) and installs capabilities. Next.js has a rich built-in preset; other frameworks (Vite/SvelteKit/Remix/Astro/Expo) use the generic install path. Use when starting a new project from scratch. Triggers after `superpowers:brainstorming` confirms project scope.
---

# New Project Bootstrap

새 프로젝트의 표준 인프라를 결정론적으로 셋업한다. `superpowers:brainstorming` 결과로 앱 컨셉이 명확해진 후 호출된다.

## 플랫폼 규약 (크로스플랫폼 — 필독)

이 스킬은 **macOS / Linux / Windows** 모두에서 동작해야 한다. 명령을 실행하기 전에 OS를 먼저 확인하고(예: `process.platform`, 또는 사용자에게 셸 확인) 그에 맞는 형태로 실행한다.

규칙:
1. **파일/디렉토리 생성·복사·삭제·탐색은 가능한 한 셸 명령 대신 Claude의 내장 도구**(Write / Read / LS / Glob / Edit)를 쓴다. 이들은 OS 무관하게 동작하고 부모 디렉토리도 자동 생성한다.
2. 셸이 꼭 필요하면 아래 표의 OS별 형태로 변환한다. 코드블록은 기본적으로 **bash(macOS/Linux/WSL/Git Bash)** 형태로 보여주되, Windows 사용자에겐 PowerShell 형태로 바꿔 안내한다.
3. `pnpm` / `npx` / `git` / `gh` / `node` 는 모든 OS에서 동일하게 동작하므로 그대로 사용한다.
4. 환경변수 prefix(`SERVICE=x cmd`)는 bash 전용이다. PowerShell은 `$env:SERVICE="x"; cmd`, cmd.exe는 `set SERVICE=x && cmd`.

| 작업 | bash (mac/linux/WSL) | PowerShell (Windows) | 권장: Claude 도구 |
|---|---|---|---|
| 디렉토리 생성 | `mkdir -p a/b` | `New-Item -ItemType Directory -Force a\b` | Write(파일 쓰면 부모 자동 생성) |
| 빈 파일 생성 | `touch f` | `New-Item -ItemType File -Force f` | Write(빈 내용) |
| 재귀 복사 | `cp -R src dst` | `Copy-Item -Recurse src dst` | — |
| 재귀 삭제 | `rm -rf dir` | `Remove-Item -Recurse -Force dir` | — |
| 경로 존재 확인 | `ls -d "<p>"` | `Test-Path "<p>"` | Read / LS |
| 파일 탐색 | `find d -name "*.html"` | `Get-ChildItem -Recurse -Filter *.html d` | Glob(`d/**/*.html`) |
| 디렉토리 내용 | `ls -la` | `Get-ChildItem -Force` | LS |
| 심볼릭 링크 | `ln -s tgt lnk` | `New-Item -ItemType SymbolicLink -Target tgt -Path lnk` (관리자/개발자모드 필요 → 기본은 복사 권장) | — |

## When to Use

- 빈 디렉토리 또는 신규 디렉토리에서 사용자가 "프로젝트 시작", "처음 만들" 등 표현
- 인프라 표준화가 필요한 새 프로젝트 (Next.js, Vite, SvelteKit, Remix, Astro, Expo 등)
- 분석/크래시/테스트가 처음부터 포함된 환경 필요

## When NOT to Use

- 기존 프로젝트에 일부만 추가 (개별 통합은 직접 진행)
- (참고) 이 스킬은 이제 프레임워크 가변이다 — Next 외 Vite/SvelteKit/Remix/Astro/Expo도 공식 스캐폴더 + generic 경로로 지원. "Next 전용"이 아님.
- 메인 세션에서 사용자가 "스킬 쓰지 마" 명시

## Required Decisions (인터뷰)

스킬 시작 시 사용자에게 다음을 확인. 디폴트 답이 있으면 그대로 진행.

| 항목 | 디폴트 | 확인 필요 |
|---|---|---|
| 프로젝트 이름 (디렉토리명) | 현재 디렉토리명 | 변경 원하면 사용자 입력 |
| 앱 설명 (1~2줄) | — | **필수 입력** |
| GitHub 레포 생성 | yes (private) | 거절 시 로컬만 |
| **스택 해소** | recommend-stack(greenfield) 추천 수락 | framework·db·auth·analytics 등 항목별 조정 가능 (Step 1.6) |
| 외부 프로젝트 생성(Supabase/Sentry 등) | yes (해당 스택 선택 시, MCP/위저드 자동) | 거절 시 SDK/설정만 |
| Sentry 프로젝트 생성 | yes | 거절 시 SDK만 설치 |
| Amplitude API key | 사용자 입력 또는 placeholder | 나중 주입 가능 |

## Bootstrap 단계 (순서 엄수)

### Step 0: 스킬 인벤토리 점검 (의존성 확인)

이 부트스트랩이 여러 단계 진행하면서 의존하는 스킬들 — 누락 시 워크플로우가 끊긴다.

| 단계 | 의존 스킬 | 역할 |
|---|---|---|
| 인터뷰 직전 | `brainstorming`, `grill-me`, `find-skills` | Discovery 마무리 |
| Step 1.6 (스택 해소/계획) | `writing-plans` | 단계화 |
| Step 3/4 (테스트 인프라) | `test-driven-development` | TDD 사이클 (Next 프리셋; 타 프레임워크는 Step 7′) |
| Step 5/6/7 (키 주입) | `setup-secrets` | API 키 안전 주입 (Next 프리셋; 타 프레임워크는 Step 7′) |
| Step 8 (구조) | `improve-codebase-architecture`, `frontend-design` | 디렉토리/디자인 |
| Step 11 (최종 검증) | `verification-before-completion` | 게이트 |

**점검 방법**: `npx skills list -g` (모든 OS 동일)를 실행하고, 출력에서 다음 이름들이 보이는지 Claude가 직접 확인한다 — 셸 `grep` 파이프는 Windows에 없으므로 쓰지 않는다:

`brainstorming` · `grill-me` · `find-skills` · `writing-plans` · `test-driven-development` · `verification-before-completion` · `frontend-design` · `improve-codebase-architecture` · `refactor`

(bash에서 빠르게 거르고 싶으면 `npx skills list -g | grep -E "brainstorm|grill-me|find-skills|writing-plans|test-driven|verification|frontend-design|improve-codebase|refactor"` 도 가능하지만 선택사항.)

기대: 9개 이상 매칭.

**누락 시 대응**:
- 누락 수가 적으면 (1~2개): 사용자에게 알리고 부트스트랩 계속 (해당 단계 수동 수행 안내)
- 다수 누락이거나 essential 번들 자체가 안 깔린 상태 (project-starter 클론 위치에서):
  ```bash
  # macOS / Linux / WSL / Git Bash
  SCOPE=global SKILL_BUNDLE=essential node scripts/install.mjs
  ```
  ```powershell
  # Windows / PowerShell
  $env:SCOPE="global"; $env:SKILL_BUNDLE="essential"; node scripts/install.mjs
  ```
  실행 후 본 부트스트랩 재시작 권장.

**점검 생략 조건**:
- `SKIP_INVENTORY=1` 환경변수 또는
- 사용자가 "스킬 점검 건너뛰자" 명시

### Step 0.5: 기존 자료 수집 (옵션)

사용자가 이미 가지고 있는 PRD, 더미 사이트, 디자인 자료 등을 `_inputs/`에 정리하고 부트스트랩 컨텍스트로 사용한다.

#### 자동 감지 + 인터뷰

먼저 `_inputs/`가 이미 존재하면 그 내용을 인벤토리에 추가. 그 다음 사용자에게 추가 경로를 묻는다.

질문 형식 (이대로 사용자에게 보여줌):
```
기존에 가지고 있는 자료가 있나요? 경로(또는 URL)를 알려주시면
_inputs/에 정리해서 부트스트랩 컨텍스트로 사용합니다.

형식 (없는 항목은 비우거나 'none' 입력):
  PRD/스펙:             <파일 또는 디렉토리 경로>
  더미 사이트/프로토타입:  <경로 또는 URL>
  디자인/와이어프레임:    <경로>
  Figma:               <URL>
  리서치/경쟁사:        <경로>
  사용자 인터뷰:        <경로>
  데이터 샘플:          <경로>

붙여넣기 또는 'none':
```

#### 자동 분류 매트릭스

| 사용자 표현 / 키워드 | `_inputs/` 분류 디렉토리 |
|---|---|
| prd, requirements, spec, 기획서, 스펙 | `_inputs/prd/` |
| dummy site, prototype, mockup, 더미, 데모, 시안 | `_inputs/dummy-site/` |
| design, wireframe, screenshot, 디자인, 와이어프레임, 시안 이미지 | `_inputs/design/` |
| `figma.com/...` URL | `_inputs/figma/` + Figma MCP 즉시 호출 |
| http/https URL (figma 외) | `_inputs/live-refs/` + Playwright 스크린샷 |
| research, competitor, market analysis, 경쟁사, 리서치 | `_inputs/research/` |
| user interview, survey, feedback, 사용자 인터뷰 | `_inputs/user-research/` |
| data, dataset, sample, csv/json sample | `_inputs/data/` |
| docs, brand guide, 문서, 브랜드 가이드 | `_inputs/docs/` |

키워드가 명확하지 않으면 사용자에게 분류 확인.

#### 처리 절차

각 경로별 (파일 작업은 Claude의 Read/LS/Glob/Write 도구 우선 — OS 무관):

1. **존재 확인**: Claude의 Read/LS 도구로 경로 확인 (또는 URL HEAD 요청). 셸이 필요하면 bash `ls -d "<path>"` / PowerShell `Test-Path "<path>"`.
2. **크기 체크**: 50MB 미만이면 자동 복사. 50MB 이상이면 복사 vs 심볼릭 링크 선택 권유 (Windows 심링크는 관리자/개발자모드 필요 → 기본은 복사 권장). 복사: bash `cp -R src dst` / PowerShell `Copy-Item -Recurse src dst`.
3. **URL 별도 처리** (모두 OS 무관):
   - Figma URL → `mcp__figma__get_design_context` 호출, 결과를 `_inputs/figma/<file-name>.json`에 저장
   - 라이브 사이트 URL → `pnpm dlx playwright install chromium` 후 페이지 스크린샷 캡처
   - GitHub URL → `gh repo clone <repo> _inputs/refs/<name> -- --depth 1` (read-only 참고용)
4. **더미 사이트 추가 자동 분석**:
   - 페이지 발견: Claude의 **Glob 도구** `_inputs/dummy-site/**/*.html` 사용 (셸 `find`/`Get-ChildItem` 불필요)
   - Playwright로 각 페이지 스크린샷 → `_inputs/dummy-site/screenshots/<page>.png`
   - HTML 구조 추출 (heading 계층, 주요 컨테이너) → `_inputs/dummy-site/structure.md`
   - CSS 변수 / 색상 토큰 추출 → `_inputs/dummy-site/tokens-draft.md`
5. **결과 보고** (표 형식):
   ```
   ✓ /path/to/spec.md       → _inputs/prd/spec.md
   ✓ /path/to/mockup/       → _inputs/dummy-site/ (12 HTML, screenshots 캡처 완료)
   ✓ figma.com/file/xxx     → _inputs/figma/main.json (15 nodes)
   ⚠ /path/that/missing     → 경로 없음 (사용자 확인 필요)
   ```

#### 후속 단계 연결

분류된 자료는 후속 부트스트랩 단계의 입력으로 자동 흘러간다:

| 분류 | 활용 단계 |
|---|---|
| `_inputs/prd/`, `_inputs/research/`, `_inputs/user-research/` | Stage 1 (Discovery) — grill-me / brainstorming 초기 컨텍스트 |
| `_inputs/dummy-site/`, `_inputs/design/`, `_inputs/figma/`, `_inputs/live-refs/` | Stage 3 (Design) — frontend-design 스킬 참고 |
| `_inputs/data/` | Stage 4 (Implementation) — 시드 데이터 / 마이그레이션 참고 |
| `_inputs/docs/` | Stage 3-4 — 일반 참고 자료 |

#### 정리 단계 (선택)

부트스트랩 완료 후 `_inputs/`를 어떻게 할지 사용자 선택:
- 유지 (`_inputs/`를 git에 포함, 참고용 영구 보존)
- `.gitignore`에 추가 (참고만 하고 코드에는 안 들어감)
- 삭제 (디스크 정리)

기본값: `.gitignore`에 `_inputs/` 추가 + 사용자가 명시 요청 시 코드에 부분 포함.

#### 입력 자료가 없을 때

`none` 또는 빈 답변이면 Step 0.5 건너뛰고 Stage 1을 그대로 진행. 디폴트 흐름과 동일.

## 중단 및 롤백 (Step별 안전망)

### 진행 추적 메커니즘

각 Step 완료 시 다음을 자동 수행한다:

1. **git commit**: `git add -A && git commit -m "[bootstrap] Step N: <description>"`
   - 부트스트랩 시작 직전에 `git init`은 Step 1에서 실행됨
   - Step 0/0.5는 git 외부 작업이라 별도 트래킹
2. **진행 로그**: `_team/bootstrap-progress.md`에 단계별 추가
   ```markdown
   ## [2026-05-31 14:23] Step N: <description>
   - 변경 파일: <list>
   - 외부 리소스 생성: <list — 예: Sentry project xxx>
   - git commit: <sha>
   ```
3. **외부 리소스 추적**: 코드 외 작업(GitHub 레포 생성, Sentry 프로젝트, Supabase 프로젝트 등)을 별도 기록 → 롤백 시 사용자에게 정리 안내

### 중단 트리거

다음 시그널 발생 시 즉시 일시 정지하고 사용자에게 선택지를 보여준다.

- **사용자 명시**: "중단", "롤백", "되돌리자", "처음부터", "stop", "rollback"
- **단계 실패 반복**: 같은 Step이 2회 연속 실패
- **AI 자체 판단**: 검증 단계(`pnpm test`, `pnpm build`)가 실패해 진행 의미 없음

### 롤백 옵션 (사용자에게 제시)

```
부트스트랩이 Step N에서 중단됐습니다. 어떻게 처리할까요?

  1) Full rollback — Step 1 직전 상태로 되돌림 (스캐폴드 전체 제거)
       명령: git reset --hard <baseline>
              git clean -fd
       
  2) Partial rollback — 마지막 안정 단계로 되돌림 (Step N-1 끝 시점)
       명령: git reset --hard <last-safe-commit>
       
  3) Keep as-is — 현재 상태 유지, 부트스트랩만 종료
       추가 정리 안 함. 수동으로 이어가거나 정리 가능.

외부 리소스도 같이 정리할까요? (y/n)
  - Sentry 프로젝트: <project-id>     (대시보드에서 삭제)
  - Supabase 프로젝트: <project-id>   (MCP delete_project 호출 가능)
  - GitHub 레포: <repo-name>          (gh repo delete 호출 가능)
  - Vercel 배포: <deployment-id>      (vercel rm 또는 대시보드)
```

선택 1, 2는 자동 실행. 외부 리소스는 사용자 동의 시 자동 정리 시도.

### 외부 리소스 정리 명령

| 리소스 | 정리 명령 |
|---|---|
| GitHub 레포 | `gh repo delete <owner>/<name> --yes` |
| Supabase 프로젝트 | Supabase MCP `delete_project(project_id)` 호출 |
| Vercel 프로젝트/배포 | `vercel rm <project-name>` 또는 Vercel MCP |
| Sentry 프로젝트 | 자동 삭제 API 없음 → 대시보드 URL 안내 |
| Amplitude 프로젝트 | 자동 삭제 API 없음 → 대시보드 URL 안내 |

### 롤백 후 보고

```
✓ Full rollback 완료
   git: <baseline-sha>로 reset
   현재 디렉토리 상태: <원래 _inputs/ 외 비어있음>

자동 정리됨:
   ✓ GitHub 레포 삭제: kimyeonsik/class-vietnamu
   ✓ Supabase 프로젝트 삭제: xyz123

수동 정리 필요:
   ! Sentry 프로젝트: https://sentry.io/settings/orgs/yk/projects/class-vietnamu/
   ! Amplitude 프로젝트: https://app.amplitude.com/...
```

### 베이스라인 태그

부트스트랩 시작 시 `bootstrap-baseline` 태그를 git에 작성:
```bash
git tag -f bootstrap-baseline
```

Full rollback은 항상 이 태그로 복귀. Partial rollback은 단계별 commit 메시지 (`[bootstrap] Step N`)로 검색해 직전 안정 단계 찾음.

### Step 1: 환경 확인

버전 확인 (모든 OS 동일):
```bash
node --version  # >= 20
pnpm --version  # 없으면 corepack enable 또는 npm i -g pnpm
gh --version    # GitHub 레포 생성 시 필요
```

현재 디렉토리 / 빈 디렉토리 여부 확인 — Claude의 **LS 도구**로 확인하는 게 가장 안전(OS 무관). 셸이 필요하면:
```bash
pwd && ls -la                       # macOS / Linux / WSL / Git Bash
```
```powershell
Get-Location; Get-ChildItem -Force  # Windows / PowerShell
```

빈 디렉토리가 아니면 (`.git` 외 파일 존재) **중단하고 사용자 확인**.

**진행 추적 시작**: 환경 확인 통과 후 `git init` 실행 + 베이스라인 태그 작성.
```bash
git init
git add -A
git commit -m "[bootstrap] Step 1: environment baseline" --allow-empty
git tag bootstrap-baseline
mkdir -p _team
echo "# Bootstrap Progress Log" > _team/bootstrap-progress.md
echo "## [$(date '+%Y-%m-%d %H:%M')] baseline" >> _team/bootstrap-progress.md
```

> 주: Step 10(Git + GitHub)에도 `git init`이 있다 — 이 진행추적이 활성화되면 Step 10의 init은 중복이므로 거기선 생략하고 원격 연결/푸시만 수행한다.

### Step 1.6: 스택 해소 (요구사항 → 추천)

아직 코드가 없다(빈 디렉터리). 요구사항을 모아 **recommend-stack(greenfield)** 으로 스택을 정한다.

1. 인터뷰: `{ appDesc(필수), platform(web|native|edge), region, budget, constraints }`. (brainstorming 결과가 있으면 재사용)
2. `recommend-stack` 스킬을 **greenfield 모드**로 호출 — 채울 capability = 표준 기본셋(framework·db·auth·analytics·error-tracking·hosting·test-runner·ci) + 사용자가 원하는 추가(email·payments·ai).
3. 추천 스택 한 벌 제시 → 사용자 **전체 수락** 또는 **항목별 조정**.
4. 결과를 **resolved 스택**으로 확정: `{ framework, capability→stack }`. 이후 단계가 이걸 참조.

> resolved.framework 가 이후 스캐폴더를, resolved의 각 capability가 설치 방식을 결정한다.

### Step 2: 베이스 스캐폴드 (resolved.framework의 공식 도구)

resolved.framework에 맞는 **공식 create 도구**로 베이스를 만든다(프레임워크별 스캐폴딩은 재발명하지 않음):

| framework | 명령 |
|---|---|
| nextjs | `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --skip-install` |
| vite | `pnpm create vite@latest . --template react-ts` |
| sveltekit | `pnpm create svelte@latest .` |
| remix | `pnpm create remix@latest .` |
| astro | `pnpm create astro@latest .` |
| expo | `pnpm create expo-app@latest .` |

그다음 `pnpm install`로 잠금 파일 안정화. 대화형 프롬프트가 막히면 사용자에게 안내.

> **Next.js**: 아래 Step 3~7의 풍부한 프리셋(Vitest/Playwright/Sentry/Amplitude/Supabase/CI)을 그대로 사용.
> **타 프레임워크**: Step 3~7 대신 **Step 7′(generic 설치)** 로 간다 — resolved의 각 capability를 `install-stack`(add)로 설치.

### Step 2.5: 설치 경로 분기 (필수 게이트)

**resolved.framework 로 분기한다. 선형으로 Step 3~7을 그냥 진행하지 말 것.**
- **resolved.framework == nextjs** → 아래 **Step 3~7 (Next.js 프리셋)** 을 그대로 진행.
- **그 외 프레임워크 (vite/sveltekit/remix/astro/expo)** → **Step 3~7을 건너뛰고 곧장 [Step 7′](#step-7-generic-capability-설치-타-프레임워크--비-default-선택)** 로 가서 resolved의 각 capability를 install-stack(add)로 설치. (Step 3~7의 명령은 Next 전용이라 타 프레임워크에서 실행 금지.)
- Next 인데 특정 capability만 비-default면, 그 capability의 Step(예: Step 7 Supabase)은 건너뛰고 Step 7′에서 선택 스택을 설치.

### Step 3: Vitest (유닛 테스트) — Next.js 프리셋 (그 외 프레임워크는 Step 7′)

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`package.json` scripts 추가:
```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

샘플 테스트 `src/lib/utils.test.ts` 작성 후 `pnpm test:run` 통과 확인.

### Step 4: Playwright (E2E, Chromium만) — Next.js 프리셋 (그 외 프레임워크는 Step 7′)

```bash
pnpm dlx playwright install chromium
pnpm add -D @playwright/test
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

`e2e/smoke.spec.ts` 샘플 작성 + `pnpm exec playwright test` 통과 확인.

`package.json`:
```json
{
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui"
}
```

### Step 5: Sentry (Crash Reporting) — Next.js 프리셋 (그 외/비-default는 Step 7′)

```bash
pnpm dlx @sentry/wizard@latest -i nextjs --skip-connect
```

`--skip-connect`로 인터랙티브 단계 회피. 사용자가 Sentry 대시보드에서 프로젝트 생성 후 DSN을 `.env.local`에 주입:
```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

현행 wizard는 `instrumentation.ts` + `instrumentation-client.ts`를 생성한다(구버전의 `sentry.client/server/edge.config.ts` 분리는 deprecated — 만약 그 형태로 생성되면 wizard 버전을 확인). `next.config.*`에 `withSentryConfig` 래핑도 추가됨. 확인 후 커밋. (`stacks/sentry.md` 참조)

키 주입 (AI에 키 노출 금지):
```bash
SERVICE=sentry node ~/.agents/skills/setup-secrets/setup-secrets.mjs
# project scope:  SERVICE=sentry node ./.claude/skills/setup-secrets/setup-secrets.mjs
# Windows (PS):   $env:SERVICE="sentry"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
```

### Step 6: Amplitude (Analytics) — Next.js 프리셋 (그 외/비-default는 Step 7′)

```bash
pnpm add @amplitude/analytics-browser
```

`src/lib/analytics.ts`:
```ts
import * as amplitude from '@amplitude/analytics-browser';

const KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

export function initAnalytics() {
  if (!KEY || typeof window === 'undefined') return;
  amplitude.init(KEY, { autocapture: true });
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!KEY) return;
  amplitude.track(event, props);
}
```

`src/app/layout.tsx`에 `<AnalyticsProvider>` 컴포넌트로 `initAnalytics()` 호출.

키 주입 (AI에 키 노출 금지):
```bash
SERVICE=amplitude node ~/.agents/skills/setup-secrets/setup-secrets.mjs
# project scope:  SERVICE=amplitude node ./.claude/skills/setup-secrets/setup-secrets.mjs
# Windows (PS):   $env:SERVICE="amplitude"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
```

### Step 7: Supabase Auth + DB — Next.js 프리셋 (그 외/비-default는 Step 7′)

Supabase MCP가 연결되어 있으면 자동:
```
1. list_organizations → org 선택
2. create_project (사용자 확인 후)
3. get_project_url + get_publishable_keys → .env.local 주입
```

수동 셋업:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

키 주입 (AI에 키 노출 금지 — 직접 페이스트):
```bash
SERVICE=supabase node ~/.agents/skills/setup-secrets/setup-secrets.mjs
# project scope:  SERVICE=supabase node ./.claude/skills/setup-secrets/setup-secrets.mjs
# Windows (PS):   $env:SERVICE="supabase"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
```

`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts` 표준 SSR 패턴 작성. (`supabase` 스킬의 SSR 가이드 참조)

> **위 Step 5~7(Sentry/Amplitude/Supabase)은 Next.js 프리셋의 기본 레시피다.** resolved에서 해당 capability가 default가 아니면(예: db=Drizzle+D1, auth=Clerk) 그 Step의 기본 레시피 대신 **Step 7′**의 install-stack 경로로 설치한다.

### Step 7′: generic capability 설치 (타 프레임워크 / 비-default 선택)

Next 프리셋이 다루지 않는 capability(타 프레임워크 전체, 또는 Next에서 비-default 선택)는 **`install-stack` 스킬을 `add` 모드**로 설치한다. resolved의 각 capability에 대해:
- 해당 스택을 `install-stack`(add)로 설치(공식 문서 리서치 → 런북 → 단계 승인 → 검증). clean git 게이트는 Step 1의 git init으로 충족.
- 표준 기본셋(test-runner·error-tracking·analytics·db·auth·ci)은 프레임워크 불문 적용(설치만 generic).
- 설치 후 규칙 vendoring은 install-stack이 adopt 재실행으로 처리(Step 7.9와 중복 시 idempotent).

### Step 7.9: adopt — 거버넌스 vendoring

스택이 깔렸으니 **adopt**으로 감지된 스택에 맞는 규칙을 `./.claude/rules/`에 vendoring하고 CLAUDE.md 관리블록을 만든다(프레임워크 무관, 비파괴):
```bash
PROJECT_ROOT="$(pwd)" node "<adopt-existing-project 스킬 디렉터리>/engine/scripts/adopt.mjs" --lang ko
```
named 규칙 없는 스택(예: sveltekit, clerk)은 capability generic으로 커버되고 리포트에 "전용 규칙 권장"으로 뜬다. (이게 신규/기존 공통 거버넌스 단계)

> **같은 엔진을 init과 상태점검이 공유한다.** 여기서 호출하는 `engine/scripts/adopt.mjs`(apply 모드)를 `inspect-project`는 `--dry-run`(read-only)으로, `adopt-existing-project`는 apply로 재실행한다 — detect→gap→vendor 체인은 하나. 부트스트랩 직후라도 `inspect-project`로 셋업이 최신인지 즉시 점검할 수 있다.

### Step 8: 디렉토리 구조

디렉토리/파일 생성은 Claude의 **Write 도구**로 하면 OS 무관하고 부모 디렉토리도 자동 생성된다 (아래 `CONTEXT.md` / ADR 내용을 바로 Write). 셸이 필요하면:
```bash
# macOS / Linux / WSL / Git Bash
mkdir -p _team/specs _team/designs _team/reviews docs/adr
touch CONTEXT.md docs/adr/0001-initial-stack.md
```
```powershell
# Windows / PowerShell
"_team/specs","_team/designs","_team/reviews","docs/adr" | ForEach-Object { New-Item -ItemType Directory -Force $_ | Out-Null }
"CONTEXT.md","docs/adr/0001-initial-stack.md" | ForEach-Object { New-Item -ItemType File -Force $_ | Out-Null }
```

`CONTEXT.md` 템플릿:
```markdown
# <Project> Context

## Domain Language
(도메인 핵심 개념 정의)

## Core Modules
(주요 모듈/책임)

## Constraints
(기술/사업 제약)
```

`docs/adr/0001-initial-stack.md`:
```markdown
# ADR 0001: Initial Stack

## Status
Accepted

## Decision
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
recommend-stack(greenfield) 추천 + 사용자 확정. 신호 근거(요구사항/궁합)는 추천 리포트 참조. 변경 시 새 ADR 발행.
```

### Step 9: 프로젝트 CLAUDE.md

```markdown
# <Project Name> Rules

<1-line description>

(프로젝트 CLAUDE.md의 스택 import는 **adopt(Step 7.9)이 resolved 스택 기준으로 자동 생성**한다 — 손으로 고정 목록을 적지 않는다. import 경로는 project scope이므로 @.claude/rules/stacks/<resolved stack>.md. named 규칙 없는 스택은 adopt이 capability generic으로 커버하고 리포트에 권장 표기.)

> 아래는 결과 형태 예시일 뿐 — import는 adopt(Step 7.9)이 생성한다. 손으로 적지 말 것.

예 (resolved = SvelteKit + Drizzle + D1 + Sentry):
@.claude/rules/stacks/drizzle.md
@.claude/rules/stacks/d1.md
@.claude/rules/stacks/sentry.md
@.claude/rules/capabilities/framework.md   # sveltekit named 없음 → generic

## Project-Specific

- 기능 추가는 항상 `superpowers:test-driven-development`로 시작
- E2E는 새 페이지/플로우 추가 시마다 작성
- Sentry: 프로덕션 에러는 자동 캡처, 핵심 로직은 명시 `Sentry.captureException`
- Amplitude: 핵심 이벤트는 `src/lib/analytics.ts`의 `track()`으로
```

### Step 10: Git + GitHub

```bash
git init
git add .
git commit -m "chore: initial bootstrap (<resolved.framework> + resolved stack)"

# 사용자 동의 시:
gh repo create <name> --private --source=. --push
```

### Step 10.5: GitHub Actions CI

PR마다 lint + unit test + build를 강제하는 게이트. `.github/workflows/ci.yml`을 Claude의 **Write 도구**로 생성(OS 무관):

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test:run
      - run: pnpm build
```

안내:
- E2E(Playwright)는 느리므로 기본 게이트에서 제외 — 필요 시 별도 job 또는 label-gated로 추가.
- 레포 푸시 후 GitHub에서 **branch protection으로 이 CI 체크를 머지 필수로 설정**해야 `git-workflow.md`의 "CI green 필수"가 실효화됨 (`stacks/github-actions.md` 참조).
- 시크릿이 필요한 단계는 GitHub Actions encrypted secrets(`${{ secrets.NAME }}`)로 — `.env.local`은 CI에 올라가지 않음.

### Step 11: 최종 검증

```bash
pnpm install
pnpm lint
pnpm test:run
pnpm build
pnpm exec playwright test
```

전부 green이면 부트스트랩 완료. 하나라도 실패하면 **사용자에게 보고 + 원인 분석**.

## 완료 후 안내

```
✅ Bootstrap 완료

다음 단계:
1. .env.local 에 실제 키 주입 (Sentry DSN, Amplitude key, Supabase URL/anon)
2. 첫 기능 개발: `superpowers:test-driven-development` 활성화 후 시작
3. E2E는 e2e/smoke.spec.ts 패턴 따라 작성

기능 개발 루프 (자동 활성화됨):
- brainstorming → writing-plans → TDD → webapp-testing → verification-before-completion
- 자동 반복은 omc:ralph 또는 omc:ultraqa
```

## 검증 체크리스트

스킬 종료 전 모두 확인:
- [ ] `pnpm test:run` 통과
- [ ] `pnpm build` 성공
- [ ] `pnpm exec playwright test` 통과
- [ ] `.env.local` 존재 (값은 placeholder OK)
- [ ] `CLAUDE.md` 프로젝트별 생성
- [ ] `_team/`, `docs/adr/` 디렉토리 존재
- [ ] `.github/workflows/ci.yml` 생성
- [ ] git 초기 커밋 완료

## 실패 시 복구

각 Step 실패 시:
1. 어떤 단계에서 멈췄는지 사용자에게 명시
2. 부분 결과 보존 (`git status`로 확인 가능)
3. 재시도는 실패 단계부터, 그 이전 단계는 idempotent로 안전

전체 롤백 필요 시:
```bash
# macOS / Linux / WSL / Git Bash
cd .. && rm -rf <project-name> && mkdir <project-name>
```
```powershell
# Windows / PowerShell
cd ..; Remove-Item -Recurse -Force <project-name>; New-Item -ItemType Directory <project-name>
```
