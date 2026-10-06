/**
 * The daily nudge: a local notification every morning — "your agent's brief is ready" — and an instant one when the
 * agent trades. Local, so it needs no push server and no APNs/FCM credentials.
 */
import * as Notifications from 'expo-notifications';

const DAILY_ID = 'xorr-clockin-daily-brief';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Granted already, or — only when `ask` — granted now. The clock-in never pops a prompt; the Me tab's switch does. */
async function allowed(ask: boolean): Promise<boolean> {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status === 'granted') return true;
  if (!ask || !perm.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

/** (Re)schedule tomorrow-morning's brief, carrying the streak the owner would lose. Returns whether it is scheduled. */
export async function scheduleDailyBrief(streak: number, ask = false, hour = 8, minute = 30): Promise<boolean> {
  try {
    if (!(await allowed(ask))) return false;
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: "Your agent's morning brief is ready",
        body: streak > 0 ? `Clock in to keep your ${streak}-day streak and collect today's SKR.` : "See what your agent did overnight and collect today's SKR.",
        data: { route: '/today' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    return true;
  } catch {
    return false;
  }
}

export async function notifyNow(title: string, body: string): Promise<void> {
  try {
    if (!(await allowed(false))) return;
    await Notifications.scheduleNotificationAsync({ content: { title, body, data: { route: '/desk' }, sound: 'default' }, trigger: null });
  } catch {
    // A notification is a courtesy; the trade is already on the trail.
  }
}
