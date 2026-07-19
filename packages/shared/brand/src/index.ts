import type { BrandConfig, BrandId } from '@marketing-studio/types';

export const brands: Record<BrandId, BrandConfig> = {
  kvidai: {
    id: 'kvidai',
    name: 'kvid.ai',
    primaryColor: '#0a0a0a',
    secondaryColor: '#ffffff',
    accentColor: '#4f46e5',
    fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
    logoPath: 'assets/kvidai-logo.png',
  },
  affy: {
    id: 'affy',
    name: 'affy.ink',
    primaryColor: '#1a1a2e',
    secondaryColor: '#e2e8f0',
    accentColor: '#e94560',
    fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
    logoPath: 'assets/affy-logo.png',
  },
};

export function getBrand(id: BrandId): BrandConfig {
  const brand = brands[id];
  if (!brand) throw new Error(`Unknown brand: ${id}`);
  return brand;
}
