---
name: setup-secrets
description: Interactively inject API keys and tokens into a project's `.env.local` without ever exposing them to the AI conversation. Use when a project needs Supabase, Vercel, Sentry, Amplitude, Cloudflare, Anthropic, or custom credentials wired in safely. The user pastes secrets directly into a shell prompt (hidden input); the AI never sees them.
---

# Setup Secrets

이 스킬은 **AI에게 절대 키를 보여주지 않고** API key / token을 `.env.local`에 안전하게 주입한다. 사용자가 직접 셸을 실행하고 키를 페이스트한다. AI는 가이드 역할만 한다.

## When to Use

- 부트스트랩 스킬이 키 주입 단계에 도달했을 때
- 기존 프로젝트에 새 서비스 키를 추가 / 교체할 때
- `.env.local` 검증이 필요할 때

## When NOT to Use

- AI 채팅에 키를 그대로 페이스트하라는 요청을 받았을 때 (이 스킬로 우회)
- CI / 프로덕션 환경 변수 (Vercel/Cloudflare 대시보드에서 직접 설정 권장)

## 보안 원칙 (필수)

1. **키는 절대 AI 채팅 / 도구 결과에 노출하지 않는다.** 셸의 `read -s`로 hidden 입력.
2. 파일은 항상 `chmod 600`.
3. `.gitignore`에 `.env.local` 보호 확인 (스킬이 자동 점검).
4. 디스플레이는 마스킹 (`abcd••••wxyz`)만 사용.
5. AI가 키 값을 받게 되면 즉시 사용자에게 알리고 그 채널 폐기.

## 호출 방법 (사용자 환경별)

### 글로벌 스코프로 설치한 경우

```bash
cd ~/projects/<your-project>
bash ~/.agents/skills/setup-secrets/setup-secrets.sh
```

### 프로젝트 스코프로 설치한 경우

프로젝트 루트에서:
```bash
bash ./.claude/skills/setup-secrets/setup-secrets.sh
```

### 클론된 레포에서 직접

```bash
cd ~/projects/<your-project>
bash ~/projects/project-starter/skills/setup-secrets/setup-secrets.sh
```

### 원격 1줄 (클론 없이)

```bash
cd ~/projects/<your-project>
bash <(curl -fsSL https://raw.githubusercontent.com/kimyeonsik/project-starter/main/skills/setup-secrets/setup-secrets.sh)
```

## 환경변수

| 변수 | 의미 | 디폴트 |
|---|---|---|
| `SERVICE` | 단일 서비스 비대화형 진입 (`supabase` / `vercel` / `sentry` / `amplitude` / `cloudflare` / `anthropic` / `custom` / `validate`) | (없음 → 메뉴) |
| `ENV_FILE` | 작성할 env 파일 경로 | `./.env.local` |
| `DRY_RUN` | `1`이면 입력만 받고 쓰지 않음 | `0` |

## AI 사용 흐름 (Claude 세션 내에서)

키 주입이 필요한 상황:

1. **AI는 셸을 직접 실행하지 않는다**. 사용자에게 명령을 보여주고 직접 실행하게 한다.
2. 어떤 서비스의 어떤 변수가 필요한지 명확히 명시.
3. 셸이 완료되면 사용자에게 `SERVICE=validate` 모드로 확인하라고 안내.
4. AI 측에선 `.env.local` 파일 내용을 **읽지 않는다** (메모리/로그 노출 방지).

예시 안내문:
```
이 단계에서 키를 주입해야 합니다. AI 채팅에 키를 직접 페이스트하지 마세요.
대신 새 터미널에서:

   SERVICE=supabase bash ~/.agents/skills/setup-secrets/setup-secrets.sh

셸이 발급 URL, 필요 권한, 보안 주의를 안내합니다. 완료 후:

   SERVICE=validate bash ~/.agents/skills/setup-secrets/setup-secrets.sh

로 검증.
```

## 셸이 처리하는 서비스 (목록만)

`Supabase` · `Vercel` · `Sentry` · `Amplitude` · `Cloudflare` · `Anthropic` · `Custom (임의 키)` · `Validate (현재 .env.local 점검)`

각 서비스에 대해 셸 안에 다음이 새겨져 있다 — AI가 추측할 필요 없음:
- 발급 URL (정확한 경로)
- 필요한 권한 / 스코프 (Cloudflare는 D1 / R2 / KV별로 명시)
- 시크릿 vs 퍼블릭 구분
- 로테이션 방법

## 안전 장치

| 장치 | 동작 |
|---|---|
| `read -s` | 키 입력 시 화면에 안 보임 |
| 마스킹 표시 | 성공 후 `abcd••••wxyz` 형태로만 확인 |
| 정규식 검증 | 서비스별 패턴 (Supabase JWT `eyJ`, Anthropic `sk-ant-`, Sentry DSN, Cloudflare token 등) |
| 3회 재시도 후 skip | 잘못된 형식 반복 시 자동 중단 (부분 저장 안 됨) |
| 자동 백업 | 세션당 1회 `.env.local.backup-<timestamp>` |
| `chmod 600` | 작성/유지 시 항상 소유자만 읽기 |
| Idempotent upsert | 기존 키 → in-place 교체 (append 안 함) |
| `.gitignore` 자동 점검 | 세션 끝에 `.env.local` 보호 여부 경고 |
| `DRY_RUN=1` | 입력만 받고 파일 쓰지 않음 (사전 검증용) |

## 다른 스킬에서 호출하는 방법

`new-project-bootstrap` 스킬의 Step 5/6/7 (Sentry, Amplitude, Supabase 키 주입)에서 이 스킬을 참조한다. 직접 invoke하지 않고 사용자 안내 형태:

```
부트스트랩 Step 5 (Sentry): [setup-secrets] 스킬을 사용해 키를 주입하세요.
  SERVICE=sentry bash ~/.agents/skills/setup-secrets/setup-secrets.sh
```

## 검증 (스킬 동작 확인)

```bash
DRY_RUN=1 SERVICE=supabase bash ~/.agents/skills/setup-secrets/setup-secrets.sh
```

`[dry-run]` 접두어로 어떤 키가 어떤 마스킹 값으로 들어갈지만 출력. 실제 파일은 안 만짐.
