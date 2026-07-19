export type PromptFn = (...args: string[]) => string;

export const emailPrompts = {
  subjectLines: (topic: string, brand: string, count = 5) => `
당신은 ${brand} 브랜드 이메일 마케팅 전문가입니다.
주제: ${topic}

클릭률을 극대화하는 이메일 제목 ${count}개를 작성하세요.

조건:
- 각 제목 30자 이내 (한국어 기준)
- 스팸 필터 회피: ALL CAPS, 느낌표 남용, "무료", "클릭" 등 금지
- 첫 줄에 핵심 가치 전달
- 각 제목마다 A/B 테스트 변형 1개 추가
- 번호 목록으로 출력
`.trim(),

  bodySection: (brief: string, brand: string, section: 'intro' | 'body' | 'cta') => `
브랜드: ${brand}
Brief: ${brief}
섹션: ${section}

AIDA 구조(${section}) 이메일 카피를 작성하세요:
- intro: 공감 유발 + 핵심 문제 제시 (100-150자)
- body: 솔루션 + 증거 + 차별점 (200-300자)
- cta: 행동 유도 문구 + 버튼 텍스트 (50자 이내)
`.trim(),
};

export const blogPrompts = {
  outline: (title: string, audience: string, keywords: string[]) => `
제목: ${title}
독자: ${audience}
핵심 키워드: ${keywords.join(', ')}

SEO 최적화 블로그 글 아웃라인을 작성하세요:
- H2 3-5개, 각 H2 아래 H3 2-3개
- 메타 디스크립션 (160자 이내)
- 예상 읽기 시간
`.trim(),

  section: (heading: string, context: string, wordCount = 300) => `
소제목: ${heading}
맥락: ${context}
목표 분량: ${wordCount}자

해당 섹션 내용을 작성하세요. 전문성과 가독성을 동시에 갖춰야 합니다.
`.trim(),
};

export const cardNewsPrompts = {
  slideHeadline: (topic: string, slideNum: number, total: number, brand: string) => `
브랜드: ${brand}
주제: ${topic}
슬라이드: ${slideNum}/${total}

이 슬라이드의 헤드라인을 작성하세요:
- 20자 이내
- 임팩트 있는 단어 선택
- 다음 슬라이드 궁금증 유발 (마지막 슬라이드 제외)
`.trim(),

  caption: (topic: string, brand: string, hashtags: string[]) => `
브랜드: ${brand}
주제: ${topic}
해시태그: ${hashtags.join(' ')}

Instagram/Facebook 카드뉴스 캡션을 작성하세요:
- 첫 줄 훅: 스크롤 멈추게 하는 문장
- 본문: 핵심 내용 2-3문장
- 마지막: 저장/공유 유도 CTA
- 해시태그는 캡션 끝에 추가
`.trim(),
};
