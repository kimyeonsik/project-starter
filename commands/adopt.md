---
description: 기존 repo에 project-starter 적용 (dry-run 먼저 → 확인 → 적용)
---
`adopt-existing-project` 스킬을 사용해 **현재 repo**에 project-starter를 적용한다.

안전 흐름을 지킨다:
1. 먼저 **dry-run**으로 감지된 스택(✅named/⚠️generic)과 누락 거버넌스를 보여준다.
2. 사용자 확인을 기다린다.
3. 확인되면 적용하고, `./.claude/adopt-report.md`를 요약한다.

대상: 현재 작업 디렉터리(인자로 경로가 주어지면 그 경로). 소스 코드는 절대 수정하지 않는다.

$ARGUMENTS
