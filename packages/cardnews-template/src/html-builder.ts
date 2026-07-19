import { readFileSync } from 'fs';
import { createRequire } from 'module';
import type { BrandConfig, SlideInput } from '@marketing-studio/types';

const require = createRequire(import.meta.url);

let _fontCss: string | null = null;

function getFontCss(): string {
  if (_fontCss) return _fontCss;
  const b64 = (id: string) =>
    readFileSync(require.resolve(id)).toString('base64');

  _fontCss = `
@font-face {
  font-family: 'Pretendard';
  src: url('data:font/woff;base64,${b64('pretendard/dist/web/static/woff/Pretendard-Regular.woff')}') format('woff');
  font-weight: 400; font-style: normal;
}
@font-face {
  font-family: 'Pretendard';
  src: url('data:font/woff;base64,${b64('pretendard/dist/web/static/woff/Pretendard-Bold.woff')}') format('woff');
  font-weight: 700; font-style: normal;
}
@font-face {
  font-family: 'NotoSansThai';
  src: url('data:font/woff;base64,${b64('@fontsource/noto-sans-thai/files/noto-sans-thai-thai-400-normal.woff')}') format('woff');
  font-weight: 400; font-style: normal;
}
@font-face {
  font-family: 'NotoSansThai';
  src: url('data:font/woff;base64,${b64('@fontsource/noto-sans-thai/files/noto-sans-thai-thai-700-normal.woff')}') format('woff');
  font-weight: 700; font-style: normal;
}`;
  return _fontCss;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildSlideHtml(opts: {
  width: number;
  height: number;
  slide: SlideInput;
  brand: BrandConfig;
}): string {
  const { width, height, slide, brand } = opts;
  const { layout } = slide;
  const ac = brand.accentColor;
  const tc = brand.secondaryColor;

  const body =
    layout === 'title'   ? titleBody(width, height, slide, ac, tc) :
    layout === 'closing' ? closingBody(width, height, slide, ac, tc) :
                           contentBody(width, height, slide, ac, tc);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${getFontCss()}
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
body { font-family: 'Pretendard', 'NotoSansThai', sans-serif; }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ─── Layouts ─────────────────────────────────────────────────────────────────

function titleBody(w: number, h: number, slide: SlideInput, ac: string, tc: string): string {
  const { headline, body } = slide;
  return `
<div style="
  position: relative;
  width: ${w}px; height: ${h}px;
  background: linear-gradient(180deg, #0a0a0a 0%, #0b0b1e 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: hidden;
">
  <!-- corner glow -->
  <div style="
    position: absolute; top: 0; right: 0;
    width: 65%; height: 55%;
    background: radial-gradient(circle at 85% 12%, ${hexToRgba(ac, 0.18)} 0%, transparent 60%);
    pointer-events: none;
  "></div>

  <!-- left accent stripe -->
  <div style="
    position: absolute; left: ${Math.round(w * 0.12)}px;
    top: 20%; height: 60%; width: 10px;
    background: ${hexToRgba(ac, 0.5)};
    border-radius: 5px;
  "></div>

  <!-- bottom bar -->
  <div style="
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 8px;
    background: ${hexToRgba(ac, 0.75)};
  "></div>

  <!-- headline -->
  <div style="
    position: relative; z-index: 1;
    color: ${tc};
    font-size: 78px; font-weight: 700; line-height: 1.25;
    text-align: center;
    width: 76%; word-break: break-word;
  ">${esc(headline)}</div>

  ${body ? `<!-- body -->
  <div style="
    position: relative; z-index: 1;
    color: ${hexToRgba(tc, 0.72)};
    font-size: 38px; font-weight: 400; line-height: 1.5;
    text-align: center;
    width: 80%; margin-top: 48px; word-break: break-word;
  ">${esc(body)}</div>` : ''}
</div>`;
}

function contentBody(w: number, h: number, slide: SlideInput, ac: string, tc: string): string {
  const { headline, body } = slide;
  const marginL = Math.round(w * 0.12);
  const marginR = Math.round(w * 0.08);
  return `
<div style="
  position: relative;
  width: ${w}px; height: ${h}px;
  background: linear-gradient(140deg, #0a0a0a 0%, #0c0c1a 100%);
  display: flex; flex-direction: column; justify-content: center;
  overflow: hidden;
">
  <!-- corner glow -->
  <div style="
    position: absolute; top: 0; right: 0;
    width: 55%; height: 50%;
    background: radial-gradient(circle at 88% 8%, ${hexToRgba(ac, 0.12)} 0%, transparent 65%);
    pointer-events: none;
  "></div>

  <!-- bottom bar -->
  <div style="
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 6px;
    background: ${hexToRgba(ac, 0.55)};
  "></div>

  <!-- stripe + text row -->
  <div style="
    position: relative; z-index: 1;
    display: flex; flex-direction: row; align-items: stretch;
    margin-left: ${marginL}px; margin-right: ${marginR}px;
  ">
    <!-- accent stripe -->
    <div style="
      width: 10px; flex-shrink: 0;
      background: ${ac};
      border-radius: 5px;
      margin-right: 34px;
    "></div>

    <!-- text column -->
    <div style="flex: 1; display: flex; flex-direction: column;">
      <div style="
        color: ${tc};
        font-size: 70px; font-weight: 700; line-height: 1.3;
        word-break: break-word;
      ">${esc(headline)}</div>

      ${body ? `<div style="
        color: ${hexToRgba(tc, 0.78)};
        font-size: 36px; font-weight: 400; line-height: 1.6;
        margin-top: 44px; word-break: break-word;
      ">${esc(body)}</div>` : ''}
    </div>
  </div>
</div>`;
}

function closingBody(w: number, h: number, slide: SlideInput, ac: string, tc: string): string {
  const { headline, body } = slide;
  return `
<div style="
  position: relative;
  width: ${w}px; height: ${h}px;
  background: linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 55%, #0d0d26 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: hidden;
">
  <!-- bottom glow -->
  <div style="
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 55%;
    background: radial-gradient(ellipse at 50% 85%, ${hexToRgba(ac, 0.18)} 0%, transparent 60%);
    pointer-events: none;
  "></div>

  <!-- bottom bar -->
  <div style="
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 10px;
    background: ${ac};
  "></div>

  <!-- headline -->
  <div style="
    position: relative; z-index: 1;
    color: ${tc};
    font-size: 66px; font-weight: 700; line-height: 1.3;
    text-align: center;
    width: 80%; word-break: break-word;
  ">${esc(headline)}</div>

  <!-- separator -->
  <div style="
    position: relative; z-index: 1;
    width: 28%; height: 3px;
    background: ${hexToRgba(ac, 0.65)};
    border-radius: 2px;
    margin-top: 40px;
  "></div>

  ${body ? `<!-- CTA -->
  <div style="
    position: relative; z-index: 1;
    color: ${ac};
    font-size: 42px; font-weight: 600; line-height: 1.4;
    text-align: center;
    margin-top: 36px; word-break: break-word;
  ">${esc(body)}</div>` : ''}
</div>`;
}

function hexToRgba(hex: string, a: number): string {
  const c = hex.replace('#', '');
  return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
}
