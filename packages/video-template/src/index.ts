// Thin CLI wrapper around @marketing-studio/send-video-kvidai.
// scene 구성, prompt 등은 prompts/ 디렉토리에서 관리.

import { generateVideo } from '@marketing-studio/send-video-kvidai';

async function main() {
  const args = process.argv.slice(2);
  const projectPath = args.find(a => a.startsWith('--project='))?.replace('--project=', '') ?? '.';
  const outputPath = args.find(a => a.startsWith('--output='))?.replace('--output=', '') ?? 'outputs/video.mp4';

  await generateVideo({ projectPath, outputPath });
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
