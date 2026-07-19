# 20260525
<prompt>
/kvidai-video-project "campaigns/20260525-semiconductor/우리가 잘해서 번 게 아닙니다 역대급 실적 속에서도, 중국 반도체 경계해야하는 이유 (권석준 교수).srt" 영상 생성
- 숏츠 영상 1개만 생성 해봐
  - 영어 자막 + 영어 음성 영상 1개
  - 태국어 자막 + 태국 음성 영상 1개

* read sound fast 속도 빠르게(한국어 버전 만든 영상 확인 했는데, 음성 읽기 속도가 느려서, 영어 태국어로 만들어보려고 한다.)

-- 참고자료
https://www.youtube.com/watch?v=y_fZ4oET1dU&t=3229s
"campaigns/20260512-newspanda-iran-war"
/home/ubuntu/code_workspace/marketing-studio/.env.kvidai.production

</prompt>


<prompt>

-- plan mode
/kvidai-video-project "campaigns/20260525-semiconductor/우리가 잘해서 번 게 아닙니다 역대급 실적 속에서도, 중국 반도체 경계해야하는 이유 (권석준 교수).srt" 영상 생성
- 영상 1개 생성, 2개 국어 이상 업로드용
  - 영어 자막(그냥 youtube자동자막 쓰면 되나) + 영어 음성(그냥 youtube자동더빙 쓰면 되나) -> youtube 한국어 영상을 자동더빙(영어) 들어봤는데 나쁘지 않은데?(압권 쪽에서 따로 영어 자동더빙 올린건가? 확인 필요)
  - 한국어 자막 + 한국어 음성

** 영상 분량이 10분이상 길면 2편이상 나눠서 생성해도 됨

-- 참고자료
https://www.youtube.com/watch?v=y_fZ4oET1dU&t=3229s
"campaigns/20260512-newspanda-iran-war"
/home/ubuntu/code_workspace/marketing-studio/.env.kvidai.production

</prompt>
<answer>
←  ☐ Output strategy  ☐ Language  ☐ Generation  ✔ Submit  →

67분짜리 SRT를 어떻게 영상으로 만들까요?

❯ 1. 주제별 5~7개 클립 (각 ~10분)
     SRT를 챕터/주제 단위로 자르고, 각 챕터당 1개 영상 생성. 원본에 가깝게     재구성. 총 5~7개 업로드.
  2. 요약 쇼츠 3~5개 (각 1~3분) ✔
     핵심 인사이트만 뽑아 짧은 영상 시리즈로. 빠른 제작, YouTube Shorts/Reels      적합.
  3. 단일 10분 압축 요약본 1개
     전체를 1개의 ~10분 요약 영상으로 압축. 가장 빠른 제작, 정보 손실 큼.

영어 버전 처리 전략은?

❯ 1. 한국어 1개만 → YouTube 자동더빙에 맡김
     한국어 영상 1개만 만들고 YouTube에 업로드 → 자동더빙/자동자막으로 영어권      시청자 커버. 가장 저렴·빠름. 품질은 YouTube 의존.
  2. 한/영 별도 생성 (영상·음성·자막 모두)
     newspanda 패턴처럼 body.ko.md / body.en.md 분리하고 각 언어로 영상 별도      렌더링. 제작 시간·비용 2배, 품질 통제 가능.
  3. 한국어 영상 + 영어 자막만 추가
     음성은 한국어 유지, 영어 자막 트랙만 SRT로 추가 업로드. YouTube가 자막      기반 자동더빙. 중간 비용.

영상 생성 방식은?

  1. kvidai agent (자연어 자동편집)
     kvidai에 챕터 요약을 던지고 자동으로 보이스+이미지+자막 생성. 빠르지만 
     통제 적음. 1분 분량짜리 자동편집 영상에 강점. 10분 길이는 미검증.
  2. 커스텀 렌더링 파이프라인 직접 빌드 (newspanda 패턴)
     TTS(ElevenLabs/Deepgram) + 이미지(Replicate) + 커스텀 컴포지션. 완전한
      통제, 검증된 파이프라인. 셋업·렌더 시간 큼.
  3. 하이브리드 — kvidai로 시제품 → 부족하면 커스텀 렌더링
     먼저 kvidai로 1개 챕터 시제품 만들어 품질 확인 후, 만족스러우면 전체      kvidai로, 부족하면 커스텀 렌더링으로 전환.     
❯ 4. 표 인포그래픽 같은 cpu-intensive한 cut[image, video] asset 필요시 local에서 생성하고, 생성완료된 video를 kvidai agent에 업로드해서 최종 영상 제작 "kvidai에서 input image video의 파일 명을 인식해서 video composition에 위치에 배치하고, 부족하거나 추가가 필요한 보이스+이미지+자막 자동으로 생성" `/kvidai-video-project` skill 사용
</answer>