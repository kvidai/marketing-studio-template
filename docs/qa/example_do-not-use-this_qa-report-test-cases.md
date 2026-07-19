<!-- Source: epicmobile18/rules/contextual/docs/qa/example_do-not-use-this_qa-report-test-cases.md -->
<!-- Version: 1.0.0 -->
<!-- Last Updated: 2026-03-01 -->

# QA문서 Table - Video Edit Library

> **Automated Test Suite**: Run `make test` to execute all tests, or `make test-unit` for unit tests only (no FFmpeg required).

> **Integration Tests**: FFmpeg required. Run `make test-int` to execute integration tests.

## QA Table 메타데이터 공통내용 정의

- Priority: [P1**, P2, P3] | P1(높음), P2(중간), P3(낮음)
- Class1: [audio, video, subtitle, platform, transcript, encoding, utils, cli, ...]
- Class2: [normalize, remove-silence, watermark, reframe, ...]
- Status: [To do, Edit In progress, Edit Completed, Review in progress, Reviewer approved, Completed archive]
- Platform Type: [Linux, macOS, Windows, CLI, Library]
- confirm_staging: [X, O, O AutomatedTest, O ManualTest]
- confirm_production: [X, O, O AutomatedTest, O ManualTest]
- Description: 테스트 상세 내용

---

## QA Table - Audio Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| normalize_audio - peak 방식 정규화 | P1** | audio | normalize | To do | - | - | tests/unit/test_audio_normalize.py. input 파일에 peak 방식 정규화 적용시 target_level_db에 맞춰 gain 조정됨 확인 |
| normalize_audio - loudnorm 방식 정규화 | P1** | audio | normalize | To do | - | - | tests/unit/test_audio_normalize.py. method="loudnorm" 적용시 EBU R128 기준 정규화됨 확인 |
| remove_silence - 기본 무음 제거 | P1** | audio | remove-silence | To do | - | - | tests/unit/test_audio_remove_silence.py. threshold_db=-40, min_duration=0.5 기본값으로 무음 구간 제거됨 확인 |

---

## QA Table - Video Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| add_watermark - 기본 워터마크 추가 | P1** | video | watermark | To do | - | - | tests/integration/test_video_watermark.py. PNG 이미지 워터마크 비디오에 정상 추가됨 확인 |
| reframe - 9:16 세로 변환 | P1** | video | reframe | To do | - | - | tests/integration/test_video_reframe.py. 16:9 영상을 9:16으로 리프레임시 정상 크롭됨 확인 |


---

## QA Table - Subtitle Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| generate_subtitles - SRT 포맷 생성 | P1** | subtitle | generate-subtitles | To do | - | - | tests/unit/test_subtitle_generate.py. format="srt" 적용시 SRT 형식 자막 파일 생성됨 확인 |
| translate_subtitles - 한->영 번역 | P1** | subtitle | translate | To do | - | - | tests/integration/test_subtitle_translate.py. source_language="ko", target_language="en" 번역 정상 수행됨 확인 |
| highlight_keywords - 키워드 하이라이트 | P1** | subtitle | highlight | To do | - | - | tests/unit/test_subtitle_highlight.py. keywords 리스트에 포함된 단어들 색상 변경됨 확인 |

---

## QA Table - Platform Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| extract_thumbnail - 중간 지점 추출 | P1** | platform | thumbnail | To do | - | - | tests/integration/test_platform_thumbnail.py. method="middle" 적용시 영상 중간 프레임 추출됨 확인 |
| generate_metadata - YouTube 메타데이터 | P1** | platform | metadata | To do | - | - | tests/unit/test_platform_metadata.py. platform="youtube" 적용시 YouTube 형식 메타데이터 생성됨 확인 |

---

## QA Table - Transcript Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| remove_filler_words - 한국어 필러워드 감지 | P1** | transcript | filler-words | To do | - | - | tests/unit/test_filler_words.py. language="ko" 적용시 "음", "어", "그" 등 한국어 필러워드 감지됨 확인 |
| remove_filler_words - 영어 필러워드 감지 | P1** | transcript | filler-words | To do | - | - | language="en" 적용시 "um", "uh", "like" 등 영어 필러워드 감지됨 확인 |

---

## QA Table - Encoding Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| encode_with_preset - youtube_1080p | P1** | encoding | encode | To do | - | - | tests/integration/test_encoding.py. preset="youtube_1080p" 적용시 1080p@60fps, 8Mbps 인코딩됨 확인 |
| encode_with_preset - youtube_4k | P2 | encoding | encode | To do | - | - | preset="youtube_4k" 적용시 4K@60fps, 35Mbps 인코딩됨 확인 |

---

## QA Table - Utils Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| get_video_info - 비디오 정보 조회 | P1** | utils | ffmpeg | To do | - | - | tests/unit/test_utils_ffmpeg.py. get_video_info() 호출시 width, height, fps, duration, codec, bitrate 반환됨 확인 |
| get_audio_info - 오디오 정보 조회 | P1** | utils | ffmpeg | To do | - | - | get_audio_info() 호출시 sample_rate, channels, duration, codec, bitrate 반환됨 확인 |

---

## QA Table - CLI Module

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| CLI - video-edit --help | P1** | cli | - | To do | - | - | `video-edit --help` 실행시 사용 가능한 명령어 목록 출력됨 확인 |
| CLI - video-edit normalize | P1** | cli | normalize | To do | - | - | `video-edit normalize input.mp4 output.mp4` 정상 실행됨 확인 |
| CLI - video-edit remove-silence | P1** | cli | remove-silence | To do | - | - | `video-edit remove-silence input.mp4 output.mp4` 정상 실행됨 확인 |
| CLI - 잘못된 파일 경로 처리 | P2 | cli | - | To do | - | - | 존재하지 않는 파일 경로 입력시 적절한 에러 메시지 출력됨 확인 |

---

## QA Table - Edge Cases & Error Handling

| Title | Priority | Class1 | Class2 | Status | confirm_staging | confirm_production | Description |
|-------|----------|--------|--------|--------|-----------------|-------------------|-------------|
| 빈 비디오 파일 처리 | P2 | utils | ffmpeg | To do | - | - | 0초 길이 비디오 입력시 적절한 에러 처리됨 확인 |
| 오디오 없는 비디오 처리 | P2 | audio | - | To do | - | - | 오디오 트랙 없는 비디오에 오디오 관련 함수 호출시 적절한 처리됨 확인 |
| 비디오 없는 오디오 처리 | P2 | video | - | To do | - | - | 비디오 트랙 없는 오디오 파일에 비디오 함수 호출시 적절한 에러됨 확인 |
| 지원되지 않는 코덱 처리 | P2 | utils | ffmpeg | To do | - | - | 지원되지 않는 코덱 파일 입력시 적절한 에러 메시지됨 확인 |
| 손상된 파일 처리 | P2 | utils | /ffmpeg | To do | - | - | 손상된 미디어 파일 입력시 적절한 에러 처리됨 확인 |


---

## Summary

| Module | P1** | P2 | P3 | Total |
|--------|------|----|----|-------|
| Audio | 6 | 10 | 0 | 16 |
| Video | 15 | 22 | 0 | 37 |
| Subtitle | 16 | 17 | 0 | 33 |
| Platform | 7 | 8 | 0 | 15 |
| Transcript | 4 | 4 | 0 | 8 |
| Encoding | 5 | 7 | 0 | 12 |
| Utils | 5 | 5 | 0 | 10 |
| CLI | 14 | 2 | 0 | 16 |
| Edge Cases | 0 | 9 | 1 | 10 |
| **Total** | **72** | **84** | **1** | **157** |
