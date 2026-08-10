// 샘플 카드뉴스 (예시 — 자기 포스터에 맞게 복제·수정) — 밝은 크림/자연 톤 9:16 카드뉴스.
// 배경(하늘·언덕·해·잎)과 워드마크는 Sequence 바깥(Chrome)에서 계속 이어지고, 카드 본문만
// 부드럽게 올라오며 교체된다. 모션은 스프링 팝보다 유기적인 성장/살랑임 위주.
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BrandBar, FloatingLeaves, Scenery, Wordmark } from './Chrome';
import { BrushUnderline, Milestone, Phone, Sprout, Walker } from './motifs';
import type { SampleCardNewsProps, SampleSceneProps } from './schema';
import { fonts as F, fitText, palette as P } from './theme';

const PAD = 90;
const TOP = 306; // 워드마크 아래
const BOTTOM = 470; // 언덕 위

const FontFace: React.FC = () => (
  <style>{`
    @font-face { font-family: 'NanumSquareRound'; src: url('${staticFile('fonts/NanumSquareRoundR.ttf')}') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'NanumSquareRound'; src: url('${staticFile('fonts/NanumSquareRoundB.ttf')}') format('truetype'); font-weight: 700; }
    @font-face { font-family: 'NanumSquareRound'; src: url('${staticFile('fonts/NanumSquareRoundEB.ttf')}') format('truetype'); font-weight: 800; }
  `}</style>
);

const ramp = (frame: number, delay: number, dur: number) =>
  interpolate(frame, [delay, delay + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** 라벨 pill — 잎색 테두리 + 크림 바탕. */
const Label: React.FC<{ text: string; t: number }> = ({ text, t }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 26px 12px',
      borderRadius: 999,
      background: P.white,
      border: `2px solid ${P.green}`,
      fontFamily: F.body,
      fontWeight: 800,
      fontSize: 34,
      color: P.forest,
      opacity: t,
      transform: `translateY(${interpolate(t, [0, 1], [-16, 0])}px)`,
      boxShadow: '0 6px 16px rgba(38,56,43,0.1)',
    }}
  >
    <span style={{ width: 12, height: 12, borderRadius: '50%', background: P.sun, display: 'inline-block' }} />
    {text}
  </div>
);

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      left: PAD,
      right: PAD,
      top: TOP,
      bottom: BOTTOM,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      fontFamily: F.body,
      color: P.ink,
      wordBreak: 'keep-all',
    }}
  >
    {children}
  </div>
);

/** emphasis 조각을 그린 붓밑줄 + 진한 색으로. */
const Emph: React.FC<{ text: string; marks: string[] }> = ({ text, marks }) => {
  if (!marks.length) return <>{text}</>;
  const re = new RegExp(`(${marks.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
  return (
    <>
      {text.split(re).map((part, i) =>
        marks.includes(part) ? (
          <span key={i} style={{ position: 'relative', color: P.forest, fontWeight: 800 }}>
            {part}
            <BrushUnderline draw={1} />
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// ---------------------------------------------------------------- 씬

const Cover: React.FC<{ s: Extract<SampleSceneProps, { kind: 'cover' }>; frame: number; fps: number; w: number }> = ({ s, frame, fps, w }) => {
  const eb = ramp(frame, 2, 14);
  const size = fitText(s.titleLines, w - PAD * 2, 200);
  const walk = ramp(frame, 20, 80);
  return (
    <>
      <Body>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 34, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 33, color: P.inkSoft, opacity: eb, whiteSpace: 'pre' }}>{s.eyebrow}</span>
          {s.eyebrowTail ? (
            <span style={{ fontWeight: 800, fontSize: 33, color: P.clay, opacity: ramp(frame, 16, 12), whiteSpace: 'pre' }}>
              {s.eyebrowTail}
            </span>
          ) : null}
        </div>
        {s.titleLines.map((line, i) => {
          const p = spring({ frame: frame - (8 + i * 8), fps, config: { damping: 18, mass: 0.9 }, durationInFrames: 40 });
          return (
            <div
              key={i}
              style={{
                fontWeight: 800,
                fontSize: size,
                lineHeight: 1.02,
                letterSpacing: -2,
                whiteSpace: 'pre',
                color: i === s.titleLines.length - 1 ? P.green : P.forest,
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
        {s.subtitle ? (
          <div style={{ marginTop: 38, fontWeight: 700, fontSize: 44, color: P.inkSoft, opacity: ramp(frame, 30, 14) }}>{s.subtitle}</div>
        ) : null}
      </Body>
      {/* 언덕 능선을 걷는 사람 — 왼→오 */}
      <div style={{ position: 'absolute', left: interpolate(walk, [0, 1], [w * 0.1, w * 0.8]), top: `72%`, opacity: ramp(frame, 20, 12) }}>
        <Walker size={92} step={frame / 14} />
      </div>
    </>
  );
};

const About: React.FC<{ s: Extract<SampleSceneProps, { kind: 'about' }>; frame: number; w: number }> = ({ s, frame, w }) => {
  const box = w - PAD * 2;
  const walk = ramp(frame, 14, 92);
  return (
    <Body>
      <div style={{ fontWeight: 800, fontSize: 60, color: P.forest, opacity: ramp(frame, 2, 14), marginBottom: 40, transform: `translateY(${interpolate(ramp(frame, 2, 14), [0, 1], [-14, 0])}px)` }}>
        {s.question}
      </div>
      {s.lines.map((line, i) => {
        const p = ramp(frame, 14 + i * 8, 18);
        return (
          <div key={i} style={{ position: 'relative', fontWeight: 700, fontSize: fitText(s.lines, box, 60), lineHeight: 1.5, whiteSpace: 'pre', opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-24, 0])}px)` }}>
            <Emph text={line} marks={s.emphasis} />
          </div>
        );
      })}
      {/* 점선 길 + 걷는 사람 */}
      <div style={{ position: 'relative', marginTop: 54, height: 60 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 34, borderTop: `4px dashed ${P.green}`, opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: interpolate(walk, [0, 1], [0, box - 70]), top: 0 }}>
          <Walker size={64} step={frame / 12} color={P.forest} />
        </div>
      </div>
    </Body>
  );
};

const Recruit: React.FC<{ s: Extract<SampleSceneProps, { kind: 'recruit' }>; frame: number; fps: number }> = ({ s, frame, fps }) => {
  const count = spring({ frame: frame - 10, fps, config: { damping: 200 }, durationInFrames: 44 });
  const grow = ramp(frame, 16, 54);
  const cols = Math.min(s.count, 12);
  return (
    <Body>
      <div style={{ marginBottom: 30 }}>
        <Label text={s.label} t={ramp(frame, 0, 12)} />
      </div>
      <div style={{ fontWeight: 800, fontSize: 60, color: P.ink, opacity: ramp(frame, 8, 14), transform: `translateY(${interpolate(ramp(frame, 8, 14), [0, 1], [18, 0])}px)` }}>
        {s.who}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
        <span style={{ fontWeight: 800, fontSize: 200, lineHeight: 1.05, color: P.forest }}>{Math.round(count * s.count)}</span>
        <span style={{ fontWeight: 800, fontSize: 84, color: P.green }}>{s.unit}</span>
      </div>
      {/* 새싹이 인원만큼 자란다 */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginTop: 22, marginBottom: 34, maxWidth: 720 }}>
        {Array.from({ length: s.count }, (_, i) => (
          <Sprout key={i} size={52} grow={grow * s.count - i} />
        ))}
      </div>
      <div style={{ fontWeight: 800, fontSize: 50, color: P.green, opacity: ramp(frame, 42, 14) }}>{s.ageText}</div>
      {s.note ? (
        <div style={{ marginTop: 16, fontWeight: 400, fontSize: 34, lineHeight: 1.4, color: P.inkSoft, opacity: ramp(frame, 52, 14) }}>{s.note}</div>
      ) : null}
    </Body>
  );
};

const Schedule: React.FC<{ s: Extract<SampleSceneProps, { kind: 'schedule' }>; frame: number; w: number }> = ({ s, frame, w }) => {
  const box = w - PAD * 2;
  return (
    <Body>
      <div style={{ marginBottom: 30 }}>
        <Label text={s.label} t={ramp(frame, 0, 12)} />
      </div>
      <div style={{ position: 'relative' }}>
        {/* 세로 연결선 */}
        <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 3, background: P.green, opacity: 0.35 * ramp(frame, 8, 20) }} />
        {s.steps.map((st, i) => {
          const p = ramp(frame, 12 + i * 10, 18);
          return (
            <div key={i} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: i === 0 ? 0 : 30, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-20, 0])}px)` }}>
              <div style={{ paddingTop: 6 }}>
                <Milestone size={40} pop={p} hot={st.hot} />
              </div>
              <div
                style={{
                  flex: 1,
                  background: P.white,
                  border: `2px solid ${st.hot ? P.sun : P.creamDeep}`,
                  borderRadius: 22,
                  padding: '20px 26px',
                  boxShadow: '0 8px 20px rgba(38,56,43,0.08)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 34, color: P.inkSoft }}>{st.tag}</div>
                <div style={{ fontWeight: 800, fontSize: fitText([st.when], box - 110, 44), whiteSpace: 'pre', color: st.hot ? P.clay : P.forest, marginTop: 4 }}>{st.when}</div>
                {st.detail ? <div style={{ fontWeight: 400, fontSize: 30, color: P.inkSoft, marginTop: 6 }}>{st.detail}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Body>
  );
};

const Apply: React.FC<{ s: Extract<SampleSceneProps, { kind: 'apply' }>; frame: number; fps: number; w: number }> = ({ s, frame, fps, w }) => {
  const qr = spring({ frame: frame - 18, fps, config: { damping: 16, mass: 1 }, durationInFrames: 42 });
  const QR = 320;
  const size = fitText(s.lead, w - PAD * 2, 88);
  return (
    <Body>
      <div style={{ marginBottom: 26 }}>
        <Label text={s.label} t={ramp(frame, 0, 12)} />
      </div>
      {s.lead.map((line, i) => {
        const p = ramp(frame, 8 + i * 7, 16);
        return (
          <div key={i} style={{ fontWeight: 800, fontSize: size, lineHeight: 1.15, whiteSpace: 'pre', color: P.forest, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [22, 0])}px)` }}>
            {line}
          </div>
        );
      })}
      <div style={{ marginTop: 26, fontWeight: 800, fontSize: 42, color: P.clay, opacity: ramp(frame, 22, 14) }}>{s.deadline}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 44 }}>
        <div
          style={{
            width: QR,
            height: QR,
            borderRadius: 24,
            background: P.white,
            padding: 12,
            opacity: qr,
            transform: `scale(${interpolate(qr, [0, 1], [0.7, 1])}) rotate(${interpolate(qr, [0, 1], [-6, 0])}deg)`,
            boxShadow: `0 16px 40px rgba(38,56,43,0.22)`,
            border: `3px solid ${P.leaf}`,
            flexShrink: 0,
          }}
        >
          {/* 예시용 QR 플레이스홀더 — 실제 포스터의 QR 을 크롭해 넣거나 <Img> 로 교체하세요. */}
          <div
            style={{
              width: '100%', height: '100%', borderRadius: 12,
              background: `repeating-conic-gradient(${P.ink} 0% 25%, ${P.white} 0% 50%) 0 / 40px 40px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ background: P.white, padding: '6px 12px', borderRadius: 8, fontWeight: 800, fontSize: 26, color: P.ink }}>QR</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 34, color: P.green, opacity: ramp(frame, 28, 14) }}>{s.qrNote}</div>
          <div style={{ marginTop: 12, fontWeight: 700, fontSize: 36, lineHeight: 1.3, color: P.ink, opacity: ramp(frame, 34, 14) }}>{s.siteName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22, fontWeight: 800, fontSize: 48, color: P.forest, opacity: ramp(frame, 42, 14) }}>
            <Phone size={44} ring={(frame % 60) / 60} />
            {s.tel}
          </div>
        </div>
      </div>
    </Body>
  );
};

// ---------------------------------------------------------------- 본체

const SceneSwitch: React.FC<{ s: SampleSceneProps; frame: number; fps: number; w: number }> = ({ s, frame, fps, w }) => {
  switch (s.kind) {
    case 'cover':
      return <Cover s={s} frame={frame} fps={fps} w={w} />;
    case 'about':
      return <About s={s} frame={frame} w={w} />;
    case 'recruit':
      return <Recruit s={s} frame={frame} fps={fps} />;
    case 'schedule':
      return <Schedule s={s} frame={frame} w={w} />;
    case 'apply':
      return <Apply s={s} frame={frame} fps={fps} w={w} />;
  }
};

const Card: React.FC<{ s: SampleSceneProps; dur: number; fps: number; w: number }> = ({ s, dur, fps, w }) => {
  const frame = useCurrentFrame();
  const enter = ramp(frame, 0, 12);
  const exit = interpolate(frame, [dur - 10, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: enter * exit, transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)` }}>
      <SceneSwitch s={s} frame={frame} fps={fps} w={w} />
    </AbsoluteFill>
  );
};

export const SampleCardNews: React.FC<SampleCardNewsProps> = ({ scenes, brandBar, wordmark, width, height, fps }) => {
  const frame = useCurrentFrame();
  const cfg = useVideoConfig();
  const w = width || cfg.width;
  const h = height || cfg.height;
  const f = fps || cfg.fps;

  const chrome = ramp(frame, 4, 16);
  let at = 0;

  return (
    <AbsoluteFill style={{ background: P.cream }}>
      <FontFace />
      <Scenery frame={frame} w={w} h={h} />
      <FloatingLeaves frame={frame} w={w} h={h} />
      <Wordmark text={wordmark} enter={chrome} />
      <BrandBar text={brandBar} enter={chrome} />

      {scenes.map((s, i) => {
        const dur = Math.round(s.durationSec * f);
        const from = at;
        at += dur;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Card s={s} dur={dur} fps={f} w={w} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
