/**
 * The daily nudge: a local notification every morning — "your agent's brief is ready" — and an instant one when the
 * agent trades. Local, so it needs no push server and no APNs/FCM credentials.
 */
import * as Notifications from 'expo-notifications';

import { Platform } from 'react-native';

const DAILY_ID = 'xorr-clockin-daily-brief';
/** Android 8+ shows nothing without a channel, and Android 13+ only offers the permission prompt once one exists. */
const CHANNEL_BRIEF = 'daily-brief';
const CHANNEL_TRADES = 'agent-trades';

let channels: Promise<void> | null = null;
function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  channels ??= Promise.all([
    Notifications.setNotificationChannelAsync(CHANNEL_BRIEF, {
      name: 'Morning brief',
      description: 'Your agent’s daily brief and your clock-in streak',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync(CHANNEL_TRADES, {
      name: 'Agent trades',
      description: 'When your agent buys or sells',
      importance: Notifications.AndroidImportance.HIGH,
    }),
  ]).then(() => undefined);
  return channels;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Granted already, or — only when `ask` — granted now. The clock-in never pops a prompt; the Me tab's switch does. */
async function allowed(ask: boolean): Promise<boolean> {
  await ensureChannels().catch(() => undefined);
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status === 'granted') return true;
  if (!ask || !perm.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

const STREAK_ID = 'xorr-clockin-streak-at-risk';
/** The evening nudge, local time: late enough to be useful, early enough to act before the UTC day ends for most. */
export const STREAK_REMINDER_HOUR = 20;

export type ReminderPlan = { on: boolean; briefAt: { hour: number; minute: number }; streak: number; checkedInToday: boolean };

/** When the evening reminder should fire: tonight if the streak is still open and 20:00 is ahead, else tomorrow night. */
export function streakReminderAt(plan: ReminderPlan, now = new Date()): Date {
  const at = new Date(now);
  at.setHours(STREAK_REMINDER_HOUR, 0, 0, 0);
  if (plan.checkedInToday || at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

/**
 * Make the scheduled reminders match the plan: the morning brief daily at the chosen time, and one evening
 * "your streak ends at midnight UTC" reminder — tonight if you have not clocked in, otherwise tomorrow night. Called on
 * launch, after every clock-in and when the settings change. `ask` may raise the permission prompt (the Profile
 * switch); nothing else does. Returns whether reminders are scheduled.
 */
export async function syncReminders(plan: ReminderPlan, ask = false, devForce = false): Promise<boolean> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
    await Notifications.cancelScheduledNotificationAsync(STREAK_ID).catch(() => undefined);
    // `devForce` (development builds only) schedules without the permission, to read the schedule back on a simulator
    // nobody can tap the iOS prompt on. iOS accepts the request; it only withholds the banner.
    if (!plan.on || (!(__DEV__ && devForce) && !(await allowed(ask)))) return false;
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: "Your agent's morning brief is ready",
        body:
          plan.streak > 0
            ? `Clock in to keep your ${plan.streak}-day streak and collect today's SKR.`
            : "See what your agent did overnight and collect today's SKR.",
        data: { route: '/' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: plan.briefAt.hour, minute: plan.briefAt.minute, channelId: CHANNEL_BRIEF },
    });
    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_ID,
      content: {
        title: plan.streak > 0 ? `Your ${plan.streak + (plan.checkedInToday ? 1 : 0)}-day streak is at risk` : 'Start a streak today',
        body: 'Clock in before midnight UTC to keep it — one signature, and the SKR is yours.',
        data: { route: '/' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: streakReminderAt(plan), channelId: CHANNEL_BRIEF },
    });
    return true;
  } catch (e) {
    if (__DEV__) console.log('[clockin] reminders not scheduled', String(e));
    return false;
  }
}

/** What is actually scheduled, read back from the OS — so the Profile can say "next brief 8:30" truthfully. */
export async function scheduledReminders(): Promise<{ brief: boolean; streakAt: Date | null }> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const brief = all.some((n) => n.identifier === DAILY_ID);
    const streak = all.find((n) => n.identifier === STREAK_ID);
    // iOS reports a date trigger back as a time interval or a date depending on the OS version; read either.
    const t = streak?.trigger as { value?: number; date?: number; seconds?: number } | null | undefined;
    const ms = t?.value ?? t?.date ?? (typeof t?.seconds === 'number' ? Date.now() + t.seconds * 1000 : undefined);
    return { brief, streakAt: typeof ms === 'number' ? new Date(ms) : null };
  } catch {
    return { brief: false, streakAt: null };
  }
}

export async function notifyNow(title: string, body: string): Promise<void> {
  try {
    if (!(await allowed(false))) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { route: '/desk' }, sound: 'default' },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_TRADES } : null,
    });
  } catch {
    // A notification is a courtesy; the trade is already on the trail.
  }
}
