// scene plan → kvid.ai composition JSON 빌더 (에이전트 미사용, Claude Code 가 직접 조립).
// item 스키마는 project 474(에이전트가 만든 실제 composition) 역설계 기반. kvid.ai 에디터 = Remotion 호환.
//
// 트랙 z-순서(아래→위): bg(solid) → visual(image/video) → audio → text.
// 타임라인: 씬 순차 배치. from/durationInFrames = 프레임 단위.

export type VisualType = 'image' | 'video';

export interface SceneCaption {
  text: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  top?: number;
  left?: number;
  width?: number;
  align?: 'left' | 'center' | 'right';
  strokeColor?: string;
  strokeWidth?: number;
}

export interface Scene {
  durationSec: number;
  background?: string; // solid 배경색 hex
  // fit: contain(기본, 캔버스 안에 다 보이게·여백) | cover(꽉 채우고 좌우/상하 크롭)
  visual?: { type: VisualType; file: string; cameraMotion?: string; fit?: 'contain' | 'cover' };
  voice?: { file: string }; // 나레이션 오디오
  captions?: SceneCaption[];
}

export interface ScenePlan {
  width?: number;
  height?: number;
  fps?: number;
  scenes: Scene[];
}

/** 파일 경로 → 업로드된 asset 정보 */
export interface AssetRef {
  assetId: string;
  remoteUrl: string;
  type: 'image' | 'video' | 'audio';
  filename: string; // 에디터가 확장자/포맷 판단에 사용 — 없으면 "_url.indexOf is not a function" 으로 재생 실패
  width?: number; // 원본 픽셀 크기 (이미지) — contain 배치 계산에 사용
  height?: number;
}

export type AssetIndex = Map<string, AssetRef>;

// deterministic id 생성
function idGen(prefix: string) {
  let n = 0;
  return () => `${prefix}${++n}`;
}

const common = (id: string, from: number, durationInFrames: number, w: number, h: number) => ({
  id,
  from,
  durationInFrames,
  top: 0,
  left: 0,
  width: w,
  height: h,
  opacity: 1,
  rotation: 0,
  isDraggingInTimeline: false,
  fadeInDurationInSeconds: 0,
  fadeOutDurationInSeconds: 0,
});

export function buildComposition(plan: ScenePlan, assets: AssetIndex) {
  const width = plan.width ?? 1080;
  const height = plan.height ?? 1920;
  const fps = plan.fps ?? 30;

  const nextItemId = idGen('it_');
  const items: Record<string, unknown> = {};
  const bgTrack: string[] = [];
  const visualTrack: string[] = [];
  const audioTrack: string[] = [];
  const textTrack: string[] = [];

  let cursor = 0; // 프레임 커서
  for (const scene of plan.scenes) {
    const dur = Math.max(1, Math.round(scene.durationSec * fps));
    const from = cursor;

    // 배경 solid
    if (scene.background) {
      const id = nextItemId();
      items[id] = {
        ...common(id, from, dur, width, height),
        type: 'solid',
        color: scene.background,
        borderRadius: 0,
        keepAspectRatio: false,
      };
      bgTrack.push(id);
    }

    // 비주얼 (image | video)
    if (scene.visual) {
      const ref = assets.get(scene.visual.file);
      if (!ref) throw new Error(`asset 미해결(visual): ${scene.visual.file}`);
      const id = nextItemId();

      // 배치 계산: contain(기본) = 캔버스 안에 다 보이게(여백) / cover = 꽉 채우고 크롭.
      // contain 은 원본 크기(ref.width/height)를 알아야 함. 모르면 full canvas(=cover).
      const fit = scene.visual.fit ?? 'contain';
      let box = { top: 0, left: 0, w: width, h: height };
      if (fit === 'contain' && ref.width && ref.height) {
        const ir = ref.width / ref.height;
        const cr = width / height;
        const dw = ir > cr ? width : Math.round(height * ir);
        const dh = ir > cr ? Math.round(width / ir) : height;
        box = { w: dw, h: dh, left: Math.round((width - dw) / 2), top: Math.round((height - dh) / 2) };
      }

      const base = {
        ...common(id, from, dur, box.w, box.h),
        top: box.top,
        left: box.left,
        type: scene.visual.type,
        assetId: ref.assetId,
        brightness: 1,
        borderRadius: 0,
        keepAspectRatio: true,
        cameraMotion: scene.visual.cameraMotion ?? 'none',
        motionIntensity: 'medium',
      };
      items[id] =
        scene.visual.type === 'video'
          ? { ...base, playbackRate: 1, videoStartFromInSeconds: 0 }
          : base;
      visualTrack.push(id);
    }

    // 나레이션 오디오
    if (scene.voice) {
      const ref = assets.get(scene.voice.file);
      if (!ref) throw new Error(`asset 미해결(voice): ${scene.voice.file}`);
      const id = nextItemId();
      items[id] = {
        id,
        from,
        durationInFrames: dur,
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        type: 'audio',
        assetId: ref.assetId,
        opacity: 1,
        playbackRate: 1,
        decibelAdjustment: 0,
        isDraggingInTimeline: false,
        audioStartFromInSeconds: 0,
        audioFadeInDurationInSeconds: 0,
        audioFadeOutDurationInSeconds: 0,
      };
      audioTrack.push(id);
    }

    // 자막 텍스트
    for (const cap of scene.captions ?? []) {
      const id = nextItemId();
      items[id] = {
        id,
        from,
        durationInFrames: dur,
        top: cap.top ?? Math.round(height * 0.75),
        left: cap.left ?? Math.round(width * 0.1),
        width: cap.width ?? Math.round(width * 0.8),
        height: 100,
        type: 'text',
        text: cap.text,
        align: cap.align ?? 'center',
        color: cap.color ?? '#ffffff',
        opacity: 1,
        fontSize: cap.fontSize ?? 64,
        rotation: 0,
        direction: 'ltr',
        fontStyle: { weight: '400', variant: 'normal' },
        background: null,
        fontFamily: cap.fontFamily ?? '검은고딕',
        lineHeight: 1.4,
        strokeColor: cap.strokeColor ?? '#000000',
        strokeWidth: cap.strokeWidth ?? 3,
        resizeOnEdit: true,
        letterSpacing: 0,
        isDraggingInTimeline: false,
        fadeInDurationInSeconds: 0,
        fadeOutDurationInSeconds: 0,
      };
      textTrack.push(id);
    }

    cursor += dur;
  }

  // assets{} — 사용된 파일만
  const assetMap: Record<string, unknown> = {};
  for (const ref of assets.values()) {
    assetMap[ref.assetId] = { id: ref.assetId, type: ref.type, filename: ref.filename, remoteUrl: ref.remoteUrl };
  }

  const trackId = idGen('tr_');
  const track = (ids: string[]) => ({ id: trackId(), items: ids, muted: false, hidden: false });
  // ⚠️ kvid.ai 에디터: tracks[] 앞쪽 요소 = 위 트랙(높은 번호) = 앞(front)에 렌더.
  //   배열 마지막 = 맨 아래 트랙(1번) = 뒤(back). → solid 배경은 반드시 배열 마지막.
  // project 474(정상 순서) 매칭: 앞→뒤 = audio(top) → text → visual → bg(bottom).
  const tracks = [audioTrack, textTrack, visualTrack, bgTrack]
    .filter((t) => t.length)
    .map(track);

  // ⚠️ durationInFrames(composition 총 길이) 누락 시 kvid.ai 에디터 타임라인 길이가 0 으로 잡혀
  //   프로젝트가 비어 보인다. cursor = 마지막 씬까지의 누적 프레임 = 전체 길이.
  return {
    fps,
    compositionWidth: width,
    compositionHeight: height,
    durationInFrames: cursor,
    tracks,
    items,
    assets: assetMap,
    deletedAssets: [],
  };
}
