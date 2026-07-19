// STUB — kvidai web push SDK 개발 완료 후 교체

export interface PushNotificationConfig {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  segment?: string;
}

export async function sendPushNotification(_config: PushNotificationConfig): Promise<void> {
  throw new Error(
    'PUSH STUB: kvidai web push SDK 개발 완료 전.\n' +
    'kvidai web push SDK가 완성되면 이 파일을 실제 구현으로 교체하세요.',
  );
}
