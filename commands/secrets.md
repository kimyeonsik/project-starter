---
description: setup-secrets로 API 키/토큰을 안전하게 주입
---
`setup-secrets` 스킬로 현재 프로젝트의 `.env.local`에 API 키를 주입한다 — 대화형이며, 키를 AI에 노출하지 않는다(직접 페이스트, no-echo).

서비스가 지정되면 그 서비스만(예: sentry/amplitude/supabase).

$ARGUMENTS
