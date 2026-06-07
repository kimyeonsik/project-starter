# project-starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | **한국어**

개인용 Claude Code 개발 인프라: 글로벌 규칙, 스택 옵트인 규칙, 그리고 두 진입점을 위한 스킬 — **새 프로젝트를 처음부터 부트스트랩**하거나, 기존 repo에 규칙을 **비파괴적으로 적용(adopt)**합니다.

여러 머신에서 일관된 개발 환경을 명령 한 줄로 복제하도록 설계되었습니다. 처음이세요? 아래 **어디서 시작하나요?** 섹션부터 보세요.

## 설치되는 것

- **글로벌 규칙** (`~/.claude/rules/`): 언어 정책, Agent Teams 워크플로우, 스킬 자동 활성화 매트릭스, git 워크플로우(브랜칭/커밋/PR), ADR 규율, 보안 베이스라인
- **스택 옵트인 규칙** (`~/.claude/rules/stacks/`): Next.js, Supabase, Vercel, Cloudflare, Playwright, Vitest, Claude API, Sentry, Amplitude, Tailwind + shadcn/ui, Resend, GitHub Actions
- **부트스트랩 스킬** (`~/.agents/skills/new-project-bootstrap/`): Next.js 15 + TypeScript + pnpm + Supabase + Sentry + Amplitude + Vitest + Playwright + GitHub Actions CI를 프롬프트 한 번으로 셋업

## 어디서 시작하나요? — 신규 vs 기존 프로젝트

project-starter는 두 가지 진입점을 제공합니다. 상황에 맞는 쪽을 고르세요:

| 가진 것 | 경로 | 하는 일 |
|---|---|---|
| **빈 디렉터리** (처음부터 시작) | **신규 프로젝트 — 부트스트랩** | `new-project-bootstrap` 스킬이 Next.js 15 + 인프라를 11단계로 결정론적으로 스캐폴딩 |
| **이미 코드가 있는 repo** | **기존 프로젝트 — 적용(adopt)** | `adopt-existing-project` 스킬이 사용 중인 스택을 감지해 맞는 규칙만 vendoring — **소스는 절대 건드리지 않음** |

두 경로 모두 먼저 project-starter의 규칙·스킬을 설치합니다(아래 **설치** 참고). 그 다음:

- **신규** → 빈 디렉터리에서 Claude 세션을 시작해 부트스트랩을 트리거 (*신규 프로젝트 — 부트스트랩* 참고).
- **기존** → 그 repo에서 Claude에게 적용 요청 (*adopt-existing-project* 스킬).

## 사전 요구사항

- Node 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- git
- (선택, 권장) 부트스트랩 스킬의 GitHub 레포 생성용 `gh`
- Claude Code CLI ([설치](https://claude.com/claude-code))

설치 안내는 `docs/prereq.md` 참고.

## 설치

내부적으로 설치기는 순수 Node.js(`scripts/install.mjs`)라 동작은 어디서나 동일하고, **진입 명령만 플랫폼별로 다릅니다.** 아래에서 본인 플랫폼을 고르세요.

- [macOS / Linux / WSL / Git Bash](#macos--linux--wsl--git-bash)
- [Windows (PowerShell)](#windows-powershell)

### 설치 스코프: project(기본) vs global

이 선택은 모든 플랫폼에서 동일합니다:

- **`project`** (기본): **현재 디렉토리**에 설치 — `./.claude/rules/`, `./.claude/skills/`, `./CLAUDE.md` 생성. `~/.claude/`는 건드리지 않음. 단일 프로젝트에서 툴킷을 써보거나 프로젝트별로 규칙을 다르게 두고 싶을 때 사용.
- **`global`**: `~/.claude/rules/`, `~/.agents/skills/`에 설치하고 `~/.claude/CLAUDE.md`에 병합. 머신의 모든 Claude 세션에 적용.

설치 시 선택 프롬프트가 뜨거나, `SCOPE=project` / `SCOPE=global`로 미리 지정할 수 있습니다 (정확한 문법은 각 플랫폼 섹션의 옵션 참고).

---

<a name="macos--linux--wsl--git-bash"></a>
### macOS / Linux / WSL / Git Bash

#### 원라이너 (project 스코프, 기본)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

> **설치 경로 안내:** project 스코프는 **현재 작업 디렉토리**(명령을 실행하는 셸의 위치)에 설치됩니다. 따라서 대상 프로젝트로 먼저 `cd`하거나(예: `cd ~/projects/my-app`), `cd` 없이 `PROJECT_ROOT=~/projects/my-app`로 디렉토리를 명시하세요(아래 옵션 참고). 원라이너에는 `cd`가 들어있지 않아 그대로 복사-붙여넣기 할 수 있습니다.

#### 원라이너 (global 스코프)

```bash
SCOPE=global bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

#### 공통 옵션

```bash
# 소스 레포를 다른 위치에 클론
TARGET=~/dev/starter bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)

# 언어 미리 선택 (언어 프롬프트 생략)
LANG_CHOICE=ko bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)

# 완전 비대화형, 특정 디렉토리에 project 스코프 설치
SCOPE=project PROJECT_ROOT=~/projects/my-app LANG_CHOICE=en \
  bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.sh)
```

#### 수동 (먼저 클론)

```bash
git clone https://github.com/kimyeonsik/project-starter ~/projects/project-starter
SCOPE=project PROJECT_ROOT=~/projects/my-app bash ~/projects/project-starter/scripts/install.sh
```

---

<a name="windows-powershell"></a>
### Windows (PowerShell)

순수 Windows에는 `bash`가 없으므로 PowerShell 부트스트랩을 사용합니다 — 레포를 클론한 뒤 동일한 Node 설치기를 실행합니다.

> **사전 요구사항:** PATH에 **Node 20+** 와 **git** (`winget install OpenJS.NodeJS.LTS`, `winget install Git.Git`). PowerShell 환경변수 문법은 `$env:NAME="value"; <명령>` — 같은 줄에서 명령 앞에 설정합니다.
>
> WSL2 / Git Bash가 있다면 [macOS / Linux](#macos--linux--wsl--git-bash) 명령을 그대로 써도 됩니다.

#### 원라이너 (project 스코프, 기본)

```powershell
irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex
```

> **설치 경로 안내:** project 스코프는 **현재 작업 디렉토리**에 설치됩니다. 대상 프로젝트로 먼저 `cd`하거나 `$env:PROJECT_ROOT`를 넘기세요(아래 옵션 참고).

#### 원라이너 (global 스코프)

```powershell
$env:SCOPE="global"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex
```

#### 공통 옵션

```powershell
# 소스 레포를 다른 위치에 클론
$env:TARGET="$HOME\dev\starter"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex

# 언어 + 스킬 번들 미리 선택 (해당 프롬프트 생략)
$env:LANG_CHOICE="ko"; $env:SKILL_BUNDLE="essential"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex

# 완전 비대화형, 특정 디렉토리에 project 스코프 설치
$env:SCOPE="project"; $env:PROJECT_ROOT="$HOME\projects\my-app"; $env:LANG_CHOICE="en"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/scripts/bootstrap.ps1 | iex
```

> PowerShell이 스크립트를 막으면(`running scripts is disabled`), 파일로 받아 실행하거나 [트러블슈팅](#트러블슈팅)을 참고하세요.

#### 수동 (먼저 클론)

```powershell
git clone https://github.com/kimyeonsik/project-starter $HOME\projects\project-starter
$env:SCOPE="project"; $env:PROJECT_ROOT="$HOME\projects\my-app"
node $HOME\projects\project-starter\scripts\install.mjs
```

---

### 설치기가 하는 일

- 기존 대상 파일(CLAUDE.md, 규칙, 스킬 디렉토리)을 타임스탬프 접미사로 백업
- 환경변수로 미리 지정하지 않았으면 **스코프**(project / global), **언어**(en / ko), **스킬 번들**(essential / full / minimal) 프롬프트
- 선택한 스코프에 규칙 세트와 부트스트랩 스킬 복사
- skills.sh의 외부 스킬을 `npx skills`로 설치 (essential / full 번들)
- 건드린 모든 파일/디렉토리/스킬을 기록한 `.project-starter-manifest` 작성
- 대상 `CLAUDE.md`에 관리 블록(`<!-- BEGIN project-starter --> ... <!-- END project-starter -->`) 삽입
- **시크릿 접근 하드닝:** 대상 `settings.json`에 `permissions.deny` 규칙을 병합해 Claude의 Read/Bash 도구가 `.env*` 파일·개인키를 열지 못하게 함 — `setup-secrets`로 저장한 키가 AI 컨텍스트에 들어가지 않도록 ([시크릿 설정](#시크릿-설정-api-키--토큰) 참고)
- 재실행 시 자가 치유: 새 블록을 쓰기 전에 기존 관리 블록을 먼저 제거하므로 중복 추가가 쌓이지 않음

재실행은 안전하며 멱등(idempotent)합니다.

## 스킬 번들

설치기는 [skills.sh](https://skills.sh)에서 엄선한 외부 스킬 세트를 받아와, 새 머신에서도 아이디어→배포까지 이어지는 스킬 세트를 한 번에 갖추게 합니다.

### 번들 선택

```bash
# 비대화형으로 미리 선택
SKILL_BUNDLE=essential bash ~/projects/project-starter/scripts/install.sh
SKILL_BUNDLE=full      bash ...
SKILL_BUNDLE=minimal   bash ...   # 외부 스킬 전부 생략
```

또는 설치 프롬프트에서 선택.

### 각 번들이 설치하는 것

**Essential** (기본 — 사용자 여정 전체 커버):

| 단계 | 스킬 |
|---|---|
| Discovery | `mattpocock/skills@grill-me`, `vercel-labs/skills@find-skills`, `obra/superpowers@brainstorming`, `obra/superpowers@writing-plans` |
| Implementation | `obra/superpowers@test-driven-development` |
| Quality | `obra/superpowers@systematic-debugging`, `mattpocock/skills@improve-codebase-architecture`, `github/awesome-copilot@refactor` (정밀 수정), `mattpocock/skills@request-refactor-plan` (RFC/계획) |
| Pre-deploy | `obra/superpowers@verification-before-completion`, `obra/superpowers@requesting-code-review` |
| Design | `anthropics/skills@frontend-design` |

**Full** (Essential + 웹 개발 + Supabase 심화):

| 단계 | 추가 스킬 |
|---|---|
| 웹 개발 | `vercel-labs/skills@vercel-react-best-practices`, `wshobson/agents@nextjs-app-router-patterns`, `wshobson/agents@typescript-advanced-types` |
| 웹 품질 | `anthropics/skills@webapp-testing`, `addyosmani/web-quality-skills@accessibility` |
| Supabase 심화 | `supabase/agent-skills@supabase`, `supabase/agent-skills@supabase-postgres-best-practices` |

**Minimal** — `new-project-bootstrap`과 `setup-secrets`만. 외부 네트워크 호출 없음. 샌드박스/CI 설치나 이미 스킬을 갖춘 경우에 사용.

### 실패 처리

| 실패 | 동작 |
|---|---|
| 네트워크 불가 (`skills.sh` 핑 안 됨) | 명확한 메시지와 함께 **설치 중단**. `SKILL_BUNDLE=minimal`로 재실행해 건너뛰거나 네트워크 복구. |
| `npx` 없음 | 중단 (Node 누락 — Node 20+ 설치). |
| 개별 스킬이 skills.sh에서 삭제/이름변경 | 경고 + `npx skills find`에서 대안 최대 3개 출력, 나머지 스킬은 계속 설치. 실패한 스킬은 매니페스트에 `external_skill_failed:`로 기록. |

### 설치 후 — 외부 스킬 관리

```bash
# 실제로 글로벌에 설치된 것은?
npx skills list -g

# 나중에 업데이트
npx skills update

# project-starter 매니페스트가 자체 설치한 것을 추적:
grep '^external_skill' ~/.claude/.project-starter-manifest        # global 스코프
grep '^external_skill' ./.claude/.project-starter-manifest         # project 스코프
```

### 제거 동작

기본적으로 `uninstall.sh`는 외부 스킬을 그대로 둡니다(다른 프로젝트에서도 쓸 수 있으므로). 함께 제거하려면:

```bash
REMOVE_EXTERNAL=1 SCOPE=global bash ~/projects/project-starter/scripts/uninstall.sh
```

## 설치 검증

### 자동 생명주기 테스트 (모든 플랫폼)

번들된 하네스를 실행합니다 — 샌드박스 임시 디렉토리(project + global 스코프)에 설치/재설치/제거를 수행하고 동등성을 검증하며, 소유자 전용 파일 권한(POSIX는 `chmod 600`, Windows는 `icacls`)을 확인한 뒤, 자동화할 수 없는 두 가지 수동 검사(숨김 시크릿 입력 + 원격 부트스트랩)를 안내합니다:

```bash
node scripts/verify.mjs
```

macOS, Linux, WSL, 순수 Windows(PowerShell / cmd)에서 동일하게 동작 — 엔진과 같은 단일 Node 하네스입니다.

### 한 줄 헬스체크 (global 스코프)

bash와 zsh 모두에서 동작 (안전하지 않은 glob 대신 `find` 사용):

```bash
sh -c '
M=$(grep -c "BEGIN project-starter" "$HOME/.claude/CLAUDE.md" 2>/dev/null || echo 0)
R=$(ls "$HOME/.claude/rules/language.md" "$HOME/.claude/rules/agent-teams.md" "$HOME/.claude/rules/skill-activation.md" 2>/dev/null | wc -l | tr -d " ")
S=$(find "$HOME/.claude/rules/stacks" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d " ")
K=$([ -f "$HOME/.agents/skills/new-project-bootstrap/SKILL.md" ] && echo OK || echo MISSING)
echo "Marker: $M"; echo "Rules: $R/3"; echo "Stacks: $S/6"; echo "Skill: $K"
'
```

기대 출력:
```
Marker: 1
Rules: 3/3
Stacks: 6/6
Skill: OK
```

진단:
- `Marker: 0` → 관리 블록 없음; `install.sh` 재실행
- `Marker: 2` 이상 → 중복(구버전 설치 버그); `install.sh` 재실행하면 자가 치유
- `Rules: 0/3` 또는 `Stacks: 0/6` 또는 `Skill: MISSING` → 설치 미완료; 재실행

### 한 줄 헬스체크 (project 스코프)

프로젝트 루트에서 실행:

```bash
sh -c '
M=$(grep -c "BEGIN project-starter" ./CLAUDE.md 2>/dev/null || echo 0)
R=$(ls ./.claude/rules/language.md ./.claude/rules/agent-teams.md ./.claude/rules/skill-activation.md 2>/dev/null | wc -l | tr -d " ")
S=$(find ./.claude/rules/stacks -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d " ")
K=$([ -f ./.claude/skills/new-project-bootstrap/SKILL.md ] && echo OK || echo MISSING)
echo "Marker: $M"; echo "Rules: $R/3"; echo "Stacks: $S/6"; echo "Skill: $K"
'
```

### import 경로가 스코프와 맞는지 확인

```bash
# global 설치는 @~/.claude/rules/... 로 표시되어야 함
grep "^@" ~/.claude/CLAUDE.md

# project 설치는 @.claude/rules/... (상대경로) 로 표시되어야 함
grep "^@" ./CLAUDE.md
```

### 라이브 검증 (가장 확실)

```bash
mkdir /tmp/ps-verify && cd /tmp/ps-verify
claude
```

Claude 세션에서:
1. 사용 가능 스킬 목록에 `new-project-bootstrap`이 보이는지 확인
2. 입력: `> 새 프로젝트 시작하자. 테스트용 앱` (또는 영어: `> start a new project, a test app`)
3. `brainstorming` 스킬이 자동 활성화되는지 확인

끝나면:
```bash
rm -rf /tmp/ps-verify
```

## 신규 프로젝트 — 부트스트랩

빈 디렉토리에서 Claude 세션을 시작하고 부트스트랩을 트리거합니다:

```bash
mkdir ~/projects/my-app && cd ~/projects/my-app
claude
```

세션에서:
```
새 프로젝트를 시작하고 싶어 — ...를 위한 모바일 웹 앱
```

`new-project-bootstrap` 스킬은 `brainstorming`이 스코프를 확정한 후 활성화됩니다. 11개의 결정론적 단계를 실행하고 lint + 테스트 + 빌드 + E2E로 검증합니다.

자동 활성화가 안 되면 강제 트리거:
```
new-project-bootstrap 스킬을 실행해줘.
```

## 신규 프로젝트: 기존 자료로 시작하기 (PRD, 더미 사이트, 디자인 참고)

이미 PRD, 동작하는 더미 사이트, Figma 파일, 기타 참고 자료가 있다면 부트스트랩이 가져다 씁니다. 미리 정리할 필요 없이 — 부트스트랩 인터뷰 중 경로를 붙여넣으면 Claude가 `_inputs/`에 분류해 줍니다.

### 동작 방식

`new-project-bootstrap`의 Step 0.5에서 Claude가 묻습니다:

```
기존에 가지고 있는 자료가 있나요? 경로를 알려주시면 _inputs/에 정리합니다.

  PRD/스펙:             <경로>
  더미 사이트/프로토타입:  <경로 또는 URL>
  디자인/와이어프레임:    <경로>
  Figma:               <URL>
  리서치/경쟁사:        <경로>
  사용자 인터뷰:        <경로>
  데이터 샘플:          <경로>

또는 'none':
```

가진 항목을 붙여넣으면 Claude가 키워드로 분류해 알맞은 슬롯에 복사(큰 파일은 심볼릭 링크)합니다.

### 자동 분류 맵

| 사용자 표현 | 분류 위치 |
|---|---|
| `prd` / `spec` / `requirements` / 기획서 | `_inputs/prd/` |
| `dummy site` / `prototype` / 더미 / 시안 | `_inputs/dummy-site/` |
| `design` / `wireframe` / `screenshot` | `_inputs/design/` |
| `figma.com/...` URL | `_inputs/figma/` (+ Figma MCP가 메타데이터 수집) |
| 기타 `http(s)://...` URL | `_inputs/live-refs/` (+ Playwright이 스크린샷 캡처) |
| `research` / `competitor` / 경쟁사 | `_inputs/research/` |
| `user interview` / `survey` | `_inputs/user-research/` |
| `data` / 샘플 CSV/JSON | `_inputs/data/` |

### 더미 사이트는 추가 처리

더미 사이트가 `_inputs/dummy-site/`에 들어오면 Claude가 추가로:
- Playwright로 페이지별 스크린샷 캡처 → `_inputs/dummy-site/screenshots/`
- HTML 구조 힌트 추출 → `_inputs/dummy-site/structure.md`
- CSS 변수 / 색상 토큰 추출 → `_inputs/dummy-site/tokens-draft.md`

이들은 Stage 3(Design)으로 흘러가 `frontend-design`이 동일한 톤으로 새 UI를 만들도록 돕습니다.

### 미리 정리된 입력도 동작

부트스트랩 시작 전에 `./_inputs/` 아래에 이미 정리해 뒀다면 자동 감지됩니다 — 다시 붙여넣을 필요 없음.

### 부트스트랩 이후

기본적으로 `_inputs/`는 `.gitignore`에 추가됩니다(참고용, 배포 제외). 자료가 스펙의 일부라면 커밋하도록 선택할 수 있습니다.

## 프로젝트별 CLAUDE.md (옵트인 스택)

부트스트랩 스킬은 다음과 같은 프로젝트 `CLAUDE.md`를 자동 생성합니다:

```markdown
# my-app Rules

@~/.claude/rules/stacks/nextjs.md
@~/.claude/rules/stacks/supabase.md
@~/.claude/rules/stacks/vercel.md
@~/.claude/rules/stacks/playwright.md
```

프로젝트가 실제로 쓰는 것에 맞춰 스택 import를 추가/제거하세요.

## 기존 프로젝트 — 적용(adopt)

이미 코드가 있는 repo라면 — **그냥 Claude에게 말하면 됩니다.** 신규 경로와 똑같은
모양이고, 직접 명령을 칠 필요가 없습니다. project-starter 설치 후, 그 repo에서
Claude 세션을 열고 이렇게 말하세요:

> "이 프로젝트에 project-starter 적용해줘."

`adopt-existing-project` 스킬이 **함께 번들된 자급자족 엔진**을 실행합니다(클론 경로
불필요): 사용 중인 스택을 감지해 맞는 규칙만 `./.claude/rules/`로 vendoring하고,
`CLAUDE.md` 관리 블록을 합성하며, 원본을 건드리지 않는 `./.claude/adopt-report.md`를
작성합니다. **소스 코드는 절대 수정하지 않습니다.** 미리보기만 하려면 "이 프로젝트
점검해줘"라고 하세요(read-only `inspect-project` 스킬).

전용 규칙이 없는(쓰고 있지만 미지원) 스택은 capability generic 규칙으로 폴백되며,
나중에 전용 규칙을 추가할 후보로 리포트에 표시됩니다.

### 스크립트 / CI (고급)

스킬은 직접 실행할 수도 있는 엔진을 호출할 뿐입니다 — 자동화에 유용:

```bash
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --lang ko   # 적용
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --dry-run    # 미리보기(read-only)
PROJECT_ROOT=/path/to/your/repo node scripts/adopt.mjs --verify     # 적용 상태 검증
```

## 시크릿 설정 (API 키 / 토큰)

`setup-secrets` 스킬(`skills/setup-secrets/setup-secrets.mjs`)로 `.env.local`에 키를 대화형으로 주입합니다. 크로스플랫폼 Node이며, `setup-secrets.sh`는 bash 셸용 얇은 wrapper 스크립트입니다. 별도 스크립트로 둔 이유:

- 시크릿이 AI 채팅에 절대 붙여넣어지지 않음 (로그/대화 기록 유출 방지)
- **에이전트도 파일을 읽지 못함:** 설치기가 `settings.json`에 `permissions.deny` 규칙을 추가해 Claude의 Read/Bash 도구가 `.env*`·개인키를 열 수 없게 함. 붙여넣은 키든 에이전트가 읽은 키든 둘 다 모델 컨텍스트에 들어가는 유출이므로, 권고가 아니라 **읽기 자체를 하드 차단합니다**. 실제 값은 런타임(`pnpm dev`, CLI)이 소비하고 코드에선 `process.env.X`로만 참조 — 에이전트는 값을 볼 일이 없습니다.
- 숨김(no-echo) 입력으로 받고 파일을 소유자 전용으로 제한 — macOS/Linux는 `chmod 600`, Windows는 `icacls`
- 각 서비스마다 **키 발급 위치**, **선택할 스코프/권한**, **시크릿 vs 퍼블릭 구분**을 먼저 안내
- 멱등 — 재실행 시 기존 키를 그 자리에서 교체하고 중복 추가하지 않음
- 매 실행의 첫 쓰기 때 `.env.local`의 타임스탬프 백업 생성

`~/.agents/skills/setup-secrets/`(global 스코프) 또는 `./.claude/skills/setup-secrets/`(project 스코프)에 스킬로 설치됩니다.

> **경로 안내:** 스크립트는 **현재 작업 디렉토리**에 `.env.local`을 쓰므로, 파일이 있어야 할 프로젝트 루트에서 실행하세요(또는 `ENV_FILE=...`로 다른 위치 지정). 아래 명령에는 `cd`가 없으니 그대로 복사-붙여넣기 하면 됩니다.

대화형 메뉴는 **Supabase / Vercel / Sentry / Amplitude / Cloudflare / Anthropic / Custom / Validate**를 제공합니다. 아래에서 본인 플랫폼을 고르세요.

---

### macOS / Linux / WSL / Git Bash

#### 대화형 메뉴

```bash
bash ~/.agents/skills/setup-secrets/setup-secrets.sh    # global 스코프 설치
bash ./.claude/skills/setup-secrets/setup-secrets.sh    # project 스코프 설치
```

#### 단일 서비스만 (비대화형 진입)

```bash
SERVICE=supabase   bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=vercel     bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=sentry     bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=amplitude  bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=cloudflare bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=anthropic  bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=custom     bash ~/.agents/skills/setup-secrets/setup-secrets.sh
SERVICE=validate   bash ~/.agents/skills/setup-secrets/setup-secrets.sh   # 현재 .env.local 검증
```

#### 기타 환경변수

```bash
ENV_FILE=./.env.production bash ...   # 다른 env 파일 대상
DRY_RUN=1 bash ...                    # 쓰지 않고 미리보기
```

#### 원격 원라이너 (설치 불필요)

스크립트는 대화형이라 실제 파일에서 실행해야 합니다(프롬프트 입력이 필요하므로 stdin 파이프 불가). 임시 파일로 받아 Node로 실행:

```bash
f="$(mktemp)"; curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/skills/setup-secrets/setup-secrets.mjs -o "$f"; node "$f"; rm -f "$f"
```

---

### Windows (PowerShell)

스크립트는 크로스플랫폼 Node — `setup-secrets.mjs`를 직접 호출합니다. `SERVICE` / `ENV_FILE` / `DRY_RUN`은 PowerShell 방식(`$env:NAME="..."`)으로 같은 줄에서 명령 앞에 설정하세요.

#### 대화형 메뉴

```powershell
node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs    # global 스코프 설치
node .\.claude\skills\setup-secrets\setup-secrets.mjs        # project 스코프 설치
```

#### 단일 서비스만 (비대화형 진입)

```powershell
$env:SERVICE="supabase";   node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="vercel";     node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="sentry";     node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="amplitude";  node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="cloudflare"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="anthropic";  node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="custom";     node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs
$env:SERVICE="validate";   node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs   # 현재 .env.local 검증
```

#### 기타 환경변수

```powershell
$env:ENV_FILE=".\.env.production"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs   # 다른 env 파일 대상
$env:DRY_RUN="1"; node $HOME\.agents\skills\setup-secrets\setup-secrets.mjs                    # 쓰지 않고 미리보기
```

#### 원격 원라이너 (설치 불필요)

```powershell
$f="$env:TEMP\setup-secrets.mjs"; irm https://raw.githubusercontent.com/kimyeonsik/project-starter/main/skills/setup-secrets/setup-secrets.mjs -OutFile $f; node $f; Remove-Item $f
```

---

### 서비스별 작성되는 변수

| 서비스 | 변수 |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (시크릿), `SUPABASE_ACCESS_TOKEN` (CLI) |
| Vercel | `VERCEL_TOKEN` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (시크릿) |
| Amplitude | `NEXT_PUBLIC_AMPLITUDE_API_KEY` |
| Cloudflare | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (시크릿) |
| Anthropic | `ANTHROPIC_API_KEY` (시크릿) |

### 내장 안전 장치

- 매 세션 종료 시 `.env.local`이 `.gitignore`로 보호되는지 보고. 아니면 실수로 커밋하기 전에 경고
- 입력값마다 형식 검증 (Supabase JWT는 `eyJ`, Anthropic은 `sk-ant-` 로 시작 등). 형식 오류 → 최대 3회 재시도 → 건너뜀
- 3회 잘못 입력하면 해당 키는 건너뜀(부분 저장 안 됨)
- 표시값은 마스킹(`abcd••••wxyz`) — 전체 시크릿은 화면에 절대 안 나옴
- 위 **validate** 항목을 언제든 실행해 `.env.local`을 재검증 (각 변수의 OK / 형식 이상 출력)

## MCP 서버 (선택, 권장)

일부 스킬은 MCP 서버(Supabase, Vercel)가 연결돼 있을 때 가장 잘 동작합니다. `docs/mcp-setup.md` 참고.

## 레포 구조

```
project-starter/
├── CLAUDE.md.template           # ~/.claude/CLAUDE.md에 추가되는 관리 블록
├── claude-rules/
│   ├── en/                      # 영어 언어 규칙 세트
│   ├── ko/                      # 한국어 언어 규칙 세트
│   └── stacks/                  # 공통(영어) 스택 규칙
├── skills/
│   ├── new-project-bootstrap/   # 부트스트랩 스킬 (SKILL.md)
│   └── setup-secrets/           # setup-secrets.mjs (엔진) + .sh wrapper
├── scripts/
│   ├── lib/util.mjs             # 공유 크로스플랫폼 헬퍼
│   ├── install.mjs              # 설치기 엔진 (macOS / Linux / Windows)
│   ├── uninstall.mjs            # 제거기 엔진
│   ├── bootstrap.sh             # 원격 진입 — bash / WSL / Git Bash
│   ├── bootstrap.ps1            # 원격 진입 — Windows / PowerShell
│   ├── install.sh               # 얇은 bash wrapper → install.mjs
│   ├── uninstall.sh             # 얇은 bash wrapper → uninstall.mjs
│   └── verify.mjs               # 크로스플랫폼 생명주기 검증 하네스
└── docs/
    ├── prereq.md
    ├── mcp-setup.md
    └── customization.md
```

## 커스터마이징

`claude-rules/`의 규칙을 수정한 뒤 `bash scripts/install.sh`(또는 원라이너)를 재실행해 적용합니다. 설치기는 덮어쓰기 전 이전 버전을 백업합니다.

재설치 덮어쓰기 없이 영구 로컬 편집을 하려면 `~/.claude/rules/*`를 직접 수정하세요 — 단 다음 설치 때 사라집니다. 이 레포를 진실의 원천(source of truth)으로 쓰세요.

`docs/customization.md` 참고.

## 트러블슈팅

| 증상 | 조치 |
|---|---|
| `install.sh: Permission denied` | `chmod +x scripts/install.sh scripts/uninstall.sh scripts/bootstrap.sh` (macOS/Linux) |
| Windows: `bash` 인식 안 됨 | [PowerShell 원라이너](#windows-powershell) 사용, 또는 `node scripts/install.mjs` 직접 실행 |
| Windows: `running scripts is disabled` (PowerShell) | 일회성: `powershell -ExecutionPolicy Bypass -File scripts\bootstrap.ps1`, 또는 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Node 20+` 경고 | `brew install node@20` (또는 nvm 사용) |
| 부트스트랩 스킬 자동 활성화 안 됨 | 설치 후 새 Claude 세션 시작; `ls ~/.agents/skills/new-project-bootstrap/SKILL.md` 확인 |
| `gh: command not found` | `brew install gh && gh auth login` (레포 생성에만 필요, 이 프로젝트 클론엔 불필요) |
| 부트스트랩 도중 실패 | `git status`로 부분 상태 확인; 실패 단계부터 재실행 (단계는 멱등) |
| 새 프로젝트 전체 롤백 | `cd .. && rm -rf <project-name> && mkdir <project-name>` |

## 제거

제거는 설치 매니페스트를 읽어 만든 것만 정확히 삭제합니다(아래 [동작 방식](#동작-방식-매니페스트-기반-제거) 참고). 본인 플랫폼을 고르세요.

---

### macOS / Linux / WSL / Git Bash

#### 빠른 제거 (대화형 — 프롬프트에서 스코프 선택)

```bash
bash ~/projects/project-starter/scripts/uninstall.sh
```

#### 비대화형

```bash
SCOPE=project bash ~/projects/project-starter/scripts/uninstall.sh   # 프로젝트 디렉토리에서 실행
SCOPE=global  bash ~/projects/project-starter/scripts/uninstall.sh
```

#### 원격 (기존 클론 없이)

제거기는 여러 파일로 된 Node라 단일 파이프 스크립트로 실행할 수 없습니다 — 임시 디렉토리에 클론한 뒤 실행:

```bash
d="$(mktemp -d)"; git clone -q https://github.com/kimyeonsik/project-starter "$d"; SCOPE=global bash "$d/scripts/uninstall.sh"; rm -rf "$d"
```

#### 완전 제거 (백업 + 클론 소스 포함 전부)

```bash
# 사용한 각 스코프에 대해 제거 + 타임스탬프 백업까지 한 번에 정리
PURGE_BACKUPS=1 SCOPE=project bash ~/projects/project-starter/scripts/uninstall.sh
PURGE_BACKUPS=1 SCOPE=global  bash ~/projects/project-starter/scripts/uninstall.sh

# 그 다음 클론된 소스 레포 제거
rm -rf ~/projects/project-starter
```

#### 깨끗이 제거되었는지 확인

```bash
# global 스코프 확인 — 모두 아무것도 출력 안 되어야 함
ls ~/.claude/rules/language.md ~/.claude/rules/skill-activation.md 2>/dev/null
ls ~/.agents/skills/new-project-bootstrap 2>/dev/null
grep -c "BEGIN project-starter" ~/.claude/CLAUDE.md 2>/dev/null  # → 0 또는 "No such file"

# project 스코프 확인 — 프로젝트 디렉토리에서 실행
ls ./.claude/rules 2>/dev/null
grep -c "BEGIN project-starter" ./CLAUDE.md 2>/dev/null  # → 0 또는 "No such file"
```

---

### Windows (PowerShell)

Node 제거기를 직접 호출합니다. `SCOPE` / `PURGE_BACKUPS`는 명령 앞에 PowerShell 방식으로 설정하세요.

#### 빠른 제거 (대화형 — 프롬프트에서 스코프 선택)

```powershell
node $HOME\projects\project-starter\scripts\uninstall.mjs
```

#### 비대화형

```powershell
$env:SCOPE="project"; node $HOME\projects\project-starter\scripts\uninstall.mjs   # 프로젝트 디렉토리에서 실행
$env:SCOPE="global";  node $HOME\projects\project-starter\scripts\uninstall.mjs
```

#### 원격 (기존 클론 없이)

```powershell
$d=Join-Path $env:TEMP ([System.Guid]::NewGuid()); git clone -q https://github.com/kimyeonsik/project-starter $d; $env:SCOPE="global"; node "$d\scripts\uninstall.mjs"; Remove-Item -Recurse -Force $d
```

#### 완전 제거 (백업 + 클론 소스 포함 전부)

```powershell
$env:PURGE_BACKUPS="1"; $env:SCOPE="project"; node $HOME\projects\project-starter\scripts\uninstall.mjs
$env:PURGE_BACKUPS="1"; $env:SCOPE="global";  node $HOME\projects\project-starter\scripts\uninstall.mjs
Remove-Item -Recurse -Force $HOME\projects\project-starter
```

#### 깨끗이 제거되었는지 확인

```powershell
# global 스코프 — 모두 에러/빈 출력이어야 함
Get-ChildItem $HOME\.claude\rules\language.md, $HOME\.agents\skills\new-project-bootstrap -ErrorAction SilentlyContinue
Select-String "BEGIN project-starter" $HOME\.claude\CLAUDE.md -ErrorAction SilentlyContinue

# project 스코프 — 프로젝트 디렉토리에서 실행
Get-ChildItem .\.claude\rules -ErrorAction SilentlyContinue
Select-String "BEGIN project-starter" .\CLAUDE.md -ErrorAction SilentlyContinue
```

> `PURGE_BACKUPS=1`은 설치 대상 디렉토리 안의 `*.backup-*` 파일만 삭제하며, 그 외엔 절대 건드리지 않습니다.

---

### 동작 방식: 매니페스트 기반 제거

설치 시점에 설치기는 `<claude_dir>/.project-starter-manifest`에 자신이 만든 모든 파일/디렉토리를 기록합니다. `uninstall.sh`는 그 매니페스트를 읽어 **정확히 그 경로만** 제거합니다 — 그 외엔 건드리지 않음.

결과:
- 그 경로 아래에 사용자가 직접 넣은 것은 **그대로 보존**
- 기존 `CLAUDE.md` 내용은 유지되고 `<!-- BEGIN/END project-starter -->` 블록만 제거
- 설치 전에 `CLAUDE.md`가 없었다면, 비어 있을 때 제거
- 여러 번 설치해도 제거 시 깨끗한 상태 (이전 실행의 잔여 파일 없음)

매니페스트가 없으면(이 메커니즘 이전의 설치 등), `uninstall.sh`는 알려진 파일명만 제거하는 폴백으로 동작하고 그 사실을 경고합니다.

### 건드리는 대상

| 항목 | Scope=project | Scope=global |
|---|---|---|
| 규칙 | `./.claude/rules/{language,agent-teams,skill-activation}.md` | `~/.claude/rules/{...}` |
| 스택 규칙 | `./.claude/rules/stacks/*.md` | `~/.claude/rules/stacks/*.md` |
| 스킬 | `./.claude/skills/new-project-bootstrap/`, `./.claude/skills/setup-secrets/` | `~/.agents/skills/new-project-bootstrap/`, `~/.agents/skills/setup-secrets/` |
| 매니페스트 | `./.claude/.project-starter-manifest` (마지막에 제거) | `~/.claude/.project-starter-manifest` |
| `CLAUDE.md` | 관리 블록 제거; 설치 전 없었으면 파일 제거 | 관리 블록 제거; 다른 내용 남아있으면 파일 보존 |
| `settings.json` | 우리가 추가한 시크릿 deny 규칙만 제거; 나머지 설정은 유지; 설치 전 없었으면 파일 제거 | 동일, `~/.claude/settings.json` |

### 보존되는 것

- 모든 `*.backup-<timestamp>` 파일 (안전망으로 디스크에 유지 — `PURGE_BACKUPS=1`로 삭제)
- 설치기가 만들지 않은 설치 디렉토리 내 모든 것 (커스텀 파일, 관리 블록 밖의 편집)
- 셸 설정, MCP 서버 설정, 기타 Claude Code 설정

## 기여

이슈와 PR 환영합니다. 개인 인프라 툴킷이라 유지보수자가 의견을 빠르게 바꿀 수 있습니다 — 자유롭게 포크해서 커스터마이징하세요.

## 라이선스

[MIT](LICENSE) © 2026 kimyeonsik
