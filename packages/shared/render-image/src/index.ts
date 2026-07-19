import sharp from 'sharp';
import type { BrandConfig } from '@marketing-studio/types';

export const INSTAGRAM_SQUARE: [number, number] = [1080, 1080];
export const INSTAGRAM_PORTRAIT: [number, number] = [1080, 1350];
export const FACEBOOK_LANDSCAPE: [number, number] = [1200, 630];

export interface SlideRenderConfig {
  width: number;
  height: number;
  svgOverlay: string;
  brand: BrandConfig;
  backgroundImagePath?: string;
}

export interface RenderedSlide {
  outputPath: string;
  width: number;
  height: number;
}

export async function renderSlide(
  config: SlideRenderConfig,
  outputPath: string,
): Promise<RenderedSlide> {
  const { width, height, svgOverlay, brand, backgroundImagePath } = config;

  const layers: sharp.OverlayOptions[] = [];
  layers.push({ input: Buffer.from(svgOverlay), gravity: 'center' });

  let base: sharp.Sharp;
  if (backgroundImagePath) {
    base = sharp(backgroundImagePath).resize(width, height, { fit: 'cover' });
  } else {
    const { r, g, b } = hexToRgb(brand.primaryColor);
    base = sharp({
      create: { width, height, channels: 3, background: { r, g, b } },
    });
  }

  await base.composite(layers).jpeg({ quality: 92 }).toFile(outputPath);

  return { outputPath, width, height };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}
