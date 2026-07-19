export type Channel = 'email' | 'blog-nodebb' | 'blog-discourse' | 'cardnews' | 'video' | 'push' | 'reddit';

export type BrandId = 'kvidai' | 'affy';

export interface BrandConfig {
  id: BrandId;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoPath: string;
}

export interface Campaign {
  slug: string;
  title: string;
  brand: BrandId;
  channel: Channel;
  createdAt: string;
  targetAudience?: string;
  brief?: string;
}

export interface Artifact {
  campaign: Campaign;
  outputDir: string;
  files: string[];
  metadata: Record<string, unknown>;
}

export interface UploadResult {
  channel: Channel;
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
  timestamp: string;
}

export interface EmailBlastInput {
  subject: string;
  previewText?: string;
  htmlBody: string;
  textBody: string;
  recipients: string[];
  fromAddress: string;
  fromName: string;
}

export interface BlogPostInput {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  target: 'nodebb' | 'discourse';
}

export interface SlideInput {
  headline: string;
  body?: string;
  imagePrompt?: string;
  backgroundImagePath?: string;
  layout: 'title' | 'content' | 'closing';
}

export interface CardNewsInput {
  slides: SlideInput[];
  caption: string;
  hashtags: string[];
  brand: BrandId;
}
