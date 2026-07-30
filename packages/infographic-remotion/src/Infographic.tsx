import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { InfographicProps } from './schema';

// 세로형 데이터 인포그래픽 클립. 제목 + 애니메이션 가로 바.
// kvid.ai composition 에 삽입할 "부분 MP4" 를 렌더한다 (통짜 완성영상 아님).
export const Infographic: React.FC<InfographicProps> = ({
  title,
  subtitle,
  items,
  accentColor,
  bgColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  const pad = Math.round(width * 0.08);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily: 'sans-serif', padding: pad }}>
      {/* 제목 */}
      <div style={{ opacity: titleProgress, transform: `translateY(${titleY}px)` }}>
        <div style={{ color: textColor, fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        {subtitle && (
          <div style={{ color: accentColor, fontSize: 40, fontWeight: 600, marginTop: 16 }}>{subtitle}</div>
        )}
      </div>

      {/* 바 차트 */}
      <div style={{ marginTop: 100, display: 'flex', flexDirection: 'column', gap: 56 }}>
        {items.map((item, i) => {
          const delay = 10 + i * 8;
          const enter = spring({ frame: frame - delay, fps, config: { damping: 200 } });
          const barWidth = interpolate(enter, [0, 1], [0, (item.value / maxValue) * 100]);
          const shown = Math.round(interpolate(enter, [0, 1], [0, item.value]));
          return (
            <div key={i} style={{ opacity: enter }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: 16,
                }}
              >
                <span style={{ color: textColor, fontSize: 44, fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: accentColor, fontSize: 52, fontWeight: 800 }}>
                  {shown}
                  {item.unit ? <span style={{ fontSize: 34, marginLeft: 6 }}>{item.unit}</span> : null}
                </span>
              </div>
              <div style={{ height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    borderRadius: 14,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
