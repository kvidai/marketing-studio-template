import { z } from 'zod';

// 샘플 카드뉴스 (예시 — 자기 포스터에 맞게 복제·수정) 카드뉴스 입력 스키마 — 이 family 전용으로 새로 설계한 씬 타입.
// 씬마다 레이아웃·모션이 붙어 있어 discriminated union 으로 고정한다(자유 조합 불가).

const base = { durationSec: z.number() };

/** 표지 — 언덕 위 대형 타이틀. */
const cover = z.object({
  kind: z.literal('cover'),
  ...base,
  eyebrow: z.string(), // "지역의 살터·일터·놀터를 경험하고"
  eyebrowTail: z.string().optional(), // "새로운 가능성을"
  titleLines: z.array(z.string()).min(1).max(3), // ["청년","로컬","커넥트"]
  subtitle: z.string().optional(),
});

/** 소개 — "○○ 란?" 질문 + 설명 줄. 길 위를 걷는 인물이 지나간다. */
const about = z.object({
  kind: z.literal('about'),
  ...base,
  question: z.string(),
  lines: z.array(z.string()).min(1).max(4),
  emphasis: z.array(z.string()).default([]), // 강조 조각(그린 밑줄)
});

/** 모집 — 인원 수가 새싹처럼 차오른다. */
const recruit = z.object({
  kind: z.literal('recruit'),
  ...base,
  label: z.string().default('모집대상'),
  who: z.string(),
  count: z.number(),
  unit: z.string().default('명'),
  ageText: z.string(),
  note: z.string().optional(),
});

/** 일정/안내 — 세로 로드맵. 스텝이 순서대로 이정표처럼 선다. */
const schedule = z.object({
  kind: z.literal('schedule'),
  ...base,
  label: z.string().default('안내'),
  steps: z
    .array(
      z.object({
        tag: z.string(), // "모집기간"
        when: z.string(), // "7.27~8.11"
        detail: z.string().optional(),
        hot: z.boolean().default(false), // 골드 강조
      })
    )
    .min(1)
    .max(4),
});

/** 신청 — QR + 접수기간 + 문의. 마지막 카드. */
const apply = z.object({
  kind: z.literal('apply'),
  ...base,
  label: z.string().default('신청방법'),
  lead: z.array(z.string()).min(1).max(2),
  deadline: z.string(),
  siteName: z.string(),
  tel: z.string(),
  qrNote: z.string().default('자세한 내용'),
});

export const sampleSceneSchema = z.discriminatedUnion('kind', [cover, about, recruit, schedule, apply]);

export const sampleCardNewsSchema = z.object({
  scenes: z.array(sampleSceneSchema).min(1).max(10),
  brandBar: z.string().default('샘플 주최 · 샘플 브랜드'),
  wordmark: z.string().default('샘플 ON 프로젝트'),
  width: z.number().default(1080),
  height: z.number().default(1920),
  fps: z.number().default(30),
});

export type SampleSceneProps = z.infer<typeof sampleSceneSchema>;
export type SampleCardNewsProps = z.infer<typeof sampleCardNewsSchema>;

export const defaultSampleCardNews: SampleCardNewsProps = {
  scenes: [
    {
      kind: 'cover',
      eyebrow: '지역의 살터·일터·놀터를 경험하고',
      eyebrowTail: '새로운 가능성을',
      titleLines: ['청년', '로컬', '커넥트'],
      subtitle: '샘플 ON 프로젝트 · 청년 참여자 모집',
      durationSec: 5,
    },
  ],
  brandBar: '샘플 주최 · 샘플 브랜드',
  wordmark: '샘플 ON 프로젝트',
  width: 1080,
  height: 1920,
  fps: 30,
};
