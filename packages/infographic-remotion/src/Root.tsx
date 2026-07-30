import { Composition } from 'remotion';
import { Infographic } from './Infographic';
import { infographicSchema, defaultInfographic } from './schema';

export const RemotionRoot: React.FC = () => {
  return (
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
  );
};
