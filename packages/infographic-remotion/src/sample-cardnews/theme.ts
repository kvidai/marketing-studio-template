// 샘플 카드뉴스 family (예시). 새 포스터용 family 를 만들 때 이 폴더를 복제해 톤/모티프/씬을
// 처음부터 다시 설계하는 출발점으로 쓴다(.claude/rules/video-generation-rules.md 참고).
// 밝은 크림 + 자연 톤 라이트 테마 예시 — 크림 배경 + 짙은 글자.
export const palette = {
  cream: '#f5f0e3', // 종이 바탕
  creamDeep: '#eae1cb', // 카드/패널 바탕
  ink: '#26382b', // 본문 짙은 숲색
  inkSoft: '#5f6f5a', // 보조 텍스트
  forest: '#2f6b3d', // 딥 그린 (제목 강조)
  green: '#4f9d55', // 프레시 그린
  leaf: '#84c56a', // 라이트 잎
  sky: '#d3e7ea', // 소프트 하늘
  skyDeep: '#aad2d7',
  sun: '#f2b33e', // 웜 골드 강조 (날짜 등)
  clay: '#d98a4e', // 테라코타 포인트
  water: '#4a90a4', // 호수 블루
  white: '#ffffff',
} as const;

export const fonts = {
  body: '"NanumSquareRound", sans-serif',
} as const;

// 줄바꿈 없이(=whiteSpace:pre) 박스 폭 안에 들어가는 글자 크기. 글자 종류별 대략 폭(em)으로 추정.
export function fitText(lines: string[], boxPx: number, maxPx: number): number {
  const emOf = (ch: string) => {
    if (/[가-힣]/.test(ch)) return 1;
    if (/\s/.test(ch)) return 0.32;
    if (/[.,~·!?()／/-]/.test(ch)) return 0.42;
    return 0.56;
  };
  const widest = Math.max(1, ...lines.map((l) => [...l].reduce((n, c) => n + emOf(c), 0)));
  return Math.floor(Math.min(maxPx, boxPx / widest));
}
