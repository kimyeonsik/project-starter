---
description: 이미 쓰는 스택을 점수화 평가(보안·유지보수·버전·적합성) + 업그레이드/교체 제안
---
`stack-assess` 스킬로 현재 프로젝트의 **기존(in-use) 스택**을 점수화한다.

먼저 `inspect`(read-only)로 스택별 설치버전·사용처·영향범위와 프로필을 얻고, 각 스택을 **리서치**해 보안·유지보수·버전 노후도·프로필 적합성을 0–100으로 평가한다. 임계 미달이면 같은 스택 **업그레이드**(install-stack upgrade로 실행) 또는 다른 스택 **교체**를 제시한다. 교체는 위험 등급으로 게이트: **risk=low**(상태없음+낮은blast+테스트)면 install-stack replace로 실행, **medium+**면 위험·전제조건 리포트만(실행 안 함). 평가 자체는 read-only다.

$ARGUMENTS
