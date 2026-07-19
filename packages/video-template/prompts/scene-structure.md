# Video Scene 구성 가이드

kvidai-template의 `context/` 패턴을 참고. 각 video 기획 시 이 구조를 따릅니다.

## Scene 구성 템플릿

```
video-name/
├── brief.md         # 목적, 타겟, 핵심 메시지, 배포 채널
├── script.md        # 전체 대본 (scene별 구분)
├── visuals.md       # scene별 비주얼 방향성, 이미지 프롬프트
├── timing.json      # scene별 시작/끝 시간
└── references/      # 참고 영상, 이미지
```

## Scene 구성 프롬프트

다음 프롬프트를 Claude에게 전달:

---

당신은 숏폼 비디오 전문 스크립트 작가입니다.

**목적**: {목적}
**타겟**: {타겟 독자}
**핵심 메시지**: {핵심 메시지}
**영상 길이**: {30초 / 60초 / 3분}
**배포**: {YouTube Shorts / Instagram Reels / TikTok}

다음을 작성해주세요:

1. **Hook (0-3초)**: 스크롤 멈추게 하는 첫 장면
2. **Scene 구성** (각 scene: 제목, 비주얼 설명, 대사/자막, 시간):
   - Scene 1: Hook
   - Scene 2-N: 본문
   - Scene N+1: CTA
3. **전체 대본** (자막 기준)
4. **배경음악 방향성**: 템포, 장르, 분위기

---
