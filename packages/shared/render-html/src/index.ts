import puppeteer, { type Browser } from 'puppeteer-core';

export interface HtmlRenderConfig {
  width: number;
  height: number;
  html: string;
}

export interface RenderedSlide {
  outputPath: string;
  width: number;
  height: number;
}

const CHROME_PATH =
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']
    .find(p => { try { require('fs').accessSync(p); return true; } catch { return false; } }) ??
  '/usr/bin/google-chrome';

let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;
  _browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

export async function renderHtml(
  config: HtmlRenderConfig,
  outputPath: string,
): Promise<RenderedSlide> {
  const { width, height, html } = config;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: outputPath as `${string}.jpg`, type: 'jpeg', quality: 92 });
  } finally {
    await page.close();
  }

  return { outputPath, width, height };
}
