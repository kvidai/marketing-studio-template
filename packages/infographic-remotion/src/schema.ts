import { z } from 'zod';

// 인포그래픽 클립 입력 스키마. /new-video 가 brief/brand 로부터 채워서 넘긴다.
export const infographicSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        unit: z.string().optional(),
      }),
    )
    .min(1)
    .max(6),
  // 브랜드 색 (팔레트는 /new-video 가 @marketing-studio/brand 에서 주입)
  accentColor: z.string().default('#2563eb'),
  bgColor: z.string().default('#0f172a'),
  textColor: z.string().default('#ffffff'),
  // 컴포지션 메타 (calculateMetadata 에서 사용)
  width: z.number().default(1080),
  height: z.number().default(1920),
  fps: z.number().default(30),
  durationSec: z.number().default(6),
});

export type InfographicProps = z.infer<typeof infographicSchema>;

export const defaultInfographic: InfographicProps = {
  title: '마케팅 자동화 효과',
  subtitle: 'kvid.ai 도입 후',
  items: [
    { label: '제작 시간', value: 80, unit: '% 단축' },
    { label: '채널 커버리지', value: 6, unit: '개' },
    { label: '월 산출물', value: 120, unit: '건' },
  ],
  accentColor: '#2563eb',
  bgColor: '#0f172a',
  textColor: '#ffffff',
  width: 1080,
  height: 1920,
  fps: 30,
  durationSec: 6,
};
