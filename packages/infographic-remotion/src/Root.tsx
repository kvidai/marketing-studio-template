import { Composition } from 'remotion';
import { Infographic } from './Infographic';
import { infographicSchema, defaultInfographic } from './schema';
import { SampleCardNews } from './sample-cardnews/SampleCardNews';
import { sampleCardNewsSchema, defaultSampleCardNews } from './sample-cardnews/schema';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Infographic"
        component={Infographic}
        schema={infographicSchema}
        defaultProps={defaultInfographic}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        // 입력 props 의 width/height/fps/durationSec 로 컴포지션 메타를 동적 설정
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSec * props.fps),
          fps: props.fps,
          width: props.width,
          height: props.height,
        })}
      />
      {/* 예시 카드뉴스 family — 새 포스터용 family 를 만들 때 복제 출발점 (sample-cardnews/) */}
      <Composition
        id="SampleCardNews"
        component={SampleCardNews}
        schema={sampleCardNewsSchema}
        defaultProps={defaultSampleCardNews}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        // 총 길이 = 씬 durationSec 합
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(
            props.scenes.reduce((sum, s) => sum + s.durationSec, 0) * props.fps,
          ),
          fps: props.fps,
          width: props.width,
          height: props.height,
        })}
      />
    </>
  );
};
