/** Web/test: no local notifications. */
export const STREAK_REMINDER_HOUR = 20;
export type ReminderPlan = { on: boolean; briefAt: { hour: number; minute: number }; streak: number; checkedInToday: boolean };
export function streakReminderAt(plan: ReminderPlan, now = new Date()): Date {
  const at = new Date(now);
  at.setHours(STREAK_REMINDER_HOUR, 0, 0, 0);
  if (plan.checkedInToday || at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}
export async function syncReminders(_plan: ReminderPlan, _ask = false, _devForce = false): Promise<boolean> {
  return false;
}
export async function scheduledReminders(): Promise<{ brief: boolean; streakAt: Date | null }> {
  return { brief: false, streakAt: null };
}
export async function notifyNow(_title: string, _body: string): Promise<void> {}
