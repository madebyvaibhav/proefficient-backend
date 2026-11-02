import { prisma } from '../prisma';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  type?: string;
  data?: any;
}

export async function sendPushNotifications(items: PushNotificationPayload | PushNotificationPayload[]) {
  const notifications = Array.isArray(items) ? items : [items];
  if (!notifications || notifications.length === 0) return;

  try {
    const userIds = Array.from(new Set(notifications.map(n => n.userId).filter(Boolean)));
    if (userIds.length === 0) return;

    const fcmTokens = await prisma.fCMToken.findMany({
      where: { userId: { in: userIds } },
    });

    if (!fcmTokens || fcmTokens.length === 0) return;

    const userTokenMap = new Map<string, string[]>();
    for (const t of fcmTokens) {
      if (t.token && t.token.trim()) {
        if (!userTokenMap.has(t.userId)) userTokenMap.set(t.userId, []);
        userTokenMap.get(t.userId)!.push(t.token.trim());
      }
    }

    const pushMessages: any[] = [];
    for (const notif of notifications) {
      const tokens = userTokenMap.get(notif.userId);
      if (tokens && tokens.length > 0) {
        for (const token of tokens) {
          pushMessages.push({
            to: token,
            sound: 'default',
            title: notif.title,
            body: notif.body,
            data: { type: notif.type || 'SYSTEM', ...(notif.data || {}) },
            priority: 'high',
            channelId: 'default',
            _displayInForeground: true,
          });
        }
      }
    }

    if (pushMessages.length === 0) return;

    // Send in chunks of 100 to Expo push endpoint
    const chunkSize = 100;
    for (let i = 0; i < pushMessages.length; i += chunkSize) {
      const chunk = pushMessages.slice(i, i + chunkSize);
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        const resData = await res.json().catch(() => null);
        console.log(`[PushNotification] Dispatched ${chunk.length} push notifications. Expo status: ${res.status}`, JSON.stringify(resData));
      } catch (err) {
        console.error('[PushNotification] Error sending push chunk:', err);
      }
    }
  } catch (error) {
    console.error('[PushNotification] Error sending push notifications:', error);
  }
}
