import satori from 'satori';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import type { BrandConfig, SlideInput } from '@marketing-studio/types';

const require = createRequire(import.meta.url);

interface SFont { name: string; data: Buffer; weight: 400 | 700; style: 'normal'; }

let _fonts: SFont[] | null = null;

function getFonts(): SFont[] {
  if (_fonts) return _fonts;
  const r = (id: string) => readFileSync(require.resolve(id));
  _fonts = [
    { name: 'Pretendard',   data: r('pretendard/dist/web/static/woff/Pretendard-Regular.woff'), weight: 400, style: 'normal' },
    { name: 'Pretendard',   data: r('pretendard/dist/web/static/woff/Pretendard-Bold.woff'),    weight: 700, style: 'normal' },
    // Thai script — separate name; CSS fontFamily includes both for automatic fallback
    { name: 'NotoSansThai', data: r('@fontsource/noto-sans-thai/files/noto-sans-thai-thai-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'NotoSansThai', data: r('@fontsource/noto-sans-thai/files/noto-sans-thai-thai-700-normal.woff'), weight: 700, style: 'normal' },
  ];
  return _fonts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = any;

/** Flex div wrapper */
function box(style: Record<string, unknown>, ...kids: (El | null | undefined)[]): El {
  const children = kids.flat().filter((c): c is El | string => c != null);
  return {
    type: 'div',
    props: {
      style: { display: 'flex', ...style },
      ...(children.length === 1 ? { children: children[0] } : children.length > 1 ? { children } : {}),
    },
  };
}

/** Text leaf — renders string content. Font stack covers Korean/Latin (Pretendard) + Thai (NotoSansThai) */
function txt(style: Record<string, unknown>, content: string): El {
  return {
    type: 'div',
    props: { style: { display: 'flex', fontFamily: 'Pretendard, NotoSansThai', ...style }, children: content },
  };
}

function rgba(hex: string, a: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export async function buildSlideSvg(opts: {
  width: number;
  height: number;
  slide: SlideInput;
  brand: BrandConfig;
}): Promise<string> {
  const { width: w, height: h, slide, brand } = opts;
  const ac = brand.accentColor;
  const tc = brand.secondaryColor;

  const el =
    slide.layout === 'title'   ? titleSlide(w, h, slide, ac, tc) :
    slide.layout === 'closing' ? closingSlide(w, h, slide, ac, tc) :
                                 contentSlide(w, h, slide, ac, tc);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return satori(el as any, { width: w, height: h, fonts: getFonts() as any });
}

// ─── Slide Layouts ───────────────────────────────────────────────────────────

function titleSlide(w: number, h: number, slide: SlideInput, ac: string, tc: string): El {
  const { headline, body } = slide;
  return box({
    width: w, height: h, position: 'relative',
    background: 'linear-gradient(180deg, #0a0a0a 0%, #0b0b1e 100%)',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
    box({ position: 'absolute', top: 0, right: 0,
      width: Math.round(w * 0.65), height: Math.round(h * 0.55),
      background: `radial-gradient(circle at 85% 12%, ${rgba(ac, 0.18)} 0%, transparent 60%)` }),
    box({ position: 'absolute', left: Math.round(w * 0.12), top: Math.round(h * 0.2),
      width: 10, height: Math.round(h * 0.6), background: rgba(ac, 0.45), borderRadius: 5 }),
    box({ position: 'absolute', bottom: 0, left: 0, width: w, height: 8, background: rgba(ac, 0.75) }),
    txt({ fontSize: 78, fontWeight: 700, color: tc, textAlign: 'center',
      lineHeight: 1.25, width: Math.round(w * 0.76), wordBreak: 'break-word' }, headline),
    body ? txt({ fontSize: 38, fontWeight: 400, color: rgba(tc, 0.72), textAlign: 'center',
      lineHeight: 1.5, marginTop: 48, width: Math.round(w * 0.8), wordBreak: 'break-word' }, body) : null,
  );
}

function contentSlide(w: number, h: number, slide: SlideInput, ac: string, tc: string): El {
  const { headline, body } = slide;
  return box({
    width: w, height: h, position: 'relative',
    background: 'linear-gradient(140deg, #0a0a0a 0%, #0c0c1a 100%)',
    flexDirection: 'column', justifyContent: 'center',
  },
    box({ position: 'absolute', top: 0, right: 0,
      width: Math.round(w * 0.55), height: Math.round(h * 0.5),
      background: `radial-gradient(circle at 88% 8%, ${rgba(ac, 0.12)} 0%, transparent 65%)` }),
    box({ position: 'absolute', bottom: 0, left: 0, width: w, height: 6, background: rgba(ac, 0.55) }),
    // stripe + text row — stripe height auto-fits text block
    box({ flexDirection: 'row', alignItems: 'stretch',
      marginLeft: Math.round(w * 0.12), marginRight: Math.round(w * 0.08) },
      box({ width: 10, borderRadius: 5, background: ac, marginRight: 34, flexShrink: 0 }),
      box({ flexDirection: 'column', flex: 1 },
        txt({ fontSize: 70, fontWeight: 700, color: tc, lineHeight: 1.3, wordBreak: 'break-word' }, headline),
        body ? txt({ fontSize: 36, fontWeight: 400, color: rgba(tc, 0.78),
          lineHeight: 1.6, marginTop: 44, wordBreak: 'break-word' }, body) : null,
      ),
    ),
  );
}

function closingSlide(w: number, h: number, slide: SlideInput, ac: string, tc: string): El {
  const { headline, body } = slide;
  return box({
    width: w, height: h, position: 'relative',
    background: 'linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 55%, #0d0d26 100%)',
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
    box({ position: 'absolute', bottom: 0, left: 0, width: w, height: Math.round(h * 0.55),
      background: `radial-gradient(ellipse at 50% 85%, ${rgba(ac, 0.18)} 0%, transparent 60%)` }),
    box({ position: 'absolute', bottom: 0, left: 0, width: w, height: 10, background: ac }),
    txt({ fontSize: 66, fontWeight: 700, color: tc, textAlign: 'center',
      lineHeight: 1.3, width: Math.round(w * 0.8), wordBreak: 'break-word' }, headline),
    box({ width: Math.round(w * 0.28), height: 3, background: rgba(ac, 0.65), borderRadius: 2, marginTop: 40 }),
    body ? txt({ fontSize: 42, fontWeight: 600, color: ac, textAlign: 'center',
      lineHeight: 1.4, marginTop: 36, wordBreak: 'break-word' }, body) : null,
  );
}
