import { Config } from '@remotion/cli/config';

// png 프레임 → 표준 yuv420p(limited range) 로 인코딩되도록. jpeg 프레임은 yuvj420p(full range)
// 를 유발해 웹 디코더가 프레임 추출에 실패한다. (render.ts 도 pixelFormat:'yuv420p' 명시)
Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
