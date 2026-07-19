# push-template — SCAFFOLD

> **현재 상태**: STUB — kvidai web push SDK 개발 완료 후 실제 구현으로 교체

## 현재 push 알림 발송 방법

kvidai web push SDK 또는 서비스 콘솔에서 직접 발송합니다.

## 이 폴더의 역할 (현재)

- `prompts/` — push 알림 문구 AI 생성 프롬프트 보관
- `in/{slug}/brief.json` — 발송할 push 내용 기획

## brief.json 구조

```json
{
  "title": "Push 알림 제목 (40자 이내)",
  "body": "알림 본문 (120자 이내)",
  "url": "클릭 시 이동할 URL",
  "icon": "아이콘 이미지 URL (선택)",
  "segment": "타겟 세그먼트 (선택)"
}
```
