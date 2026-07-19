// STUB — Meta Graph API 미설정
// Meta App 승인 후 META_PAGE_ACCESS_TOKEN, META_PAGE_ID, META_IG_ACCOUNT_ID를
// .env.production(또는 brand.env.production)에 추가하면 이 파일을 실제 구현으로 교체.

export interface MetaConfig {
  pageAccessToken: string;
  pageId: string;
  igAccountId?: string;
}

export interface MetaUploadResult {
  postId: string;
  permalink: string;
}

export async function uploadToInstagram(
  _config: MetaConfig,
  _imagePaths: string[],
  _caption: string,
): Promise<MetaUploadResult> {
  throw new Error(
    'META STUB: Instagram Graph API 미설정.\n' +
    'Meta App 승인 후 META_PAGE_ACCESS_TOKEN, META_IG_ACCOUNT_ID를 .env.production에 추가하세요.',
  );
}

export async function uploadToFacebook(
  _config: MetaConfig,
  _imagePaths: string[],
  _caption: string,
): Promise<MetaUploadResult> {
  throw new Error(
    'META STUB: Facebook Graph API 미설정.\n' +
    'Meta App 승인 후 META_PAGE_ACCESS_TOKEN, META_PAGE_ID를 .env.production에 추가하세요.',
  );
}
