/**
 * The daily clock-in — the reason to open the app every day.
 *
 * One check-in per UTC day. Consecutive days build a streak; a missed day resets it to 1. The reward is paid in devnet
 * SKR stand-in by the check-in transaction itself, so a streak is a run of signed, on-chain memos — not a counter.
 */

/** `YYYY-MM-DD` in UTC: the day a check-in counts for. UTC so a phone crossing time zones cannot check in twice. */
export function dayKey(at: Date | number = Date.now()): string {
  const d = new Date(at);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (both day keys). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type StreakState = {
  /** Day keys checked in, newest last. */
  days: string[];
};

/** Has the owner already clocked in today? */
export function checkedInToday(s: StreakState, now: Date | number = Date.now()): boolean {
  return s.days[s.days.length - 1] === dayKey(now);
}

/**
 * The streak as of `now`: consecutive days ending today or yesterday. A streak whose last day is yesterday is still
 * alive — it is broken only once a whole day has passed without a check-in.
 */
export function currentStreak(s: StreakState, now: Date | number = Date.now()): number {
  if (!s.days.length) return 0;
  const today = dayKey(now);
  const last = s.days[s.days.length - 1]!;
  const gap = daysBetween(last, today);
  if (gap > 1) return 0;
  let n = 1;
  for (let i = s.days.length - 1; i > 0; i--) {
    if (daysBetween(s.days[i - 1]!, s.days[i]!) === 1) n++;
    else break;
  }
  return n;
}

/** The streak a check-in made now would produce. */
export function streakAfterCheckIn(s: StreakState, now: Date | number = Date.now()): number {
  if (checkedInToday(s, now)) return currentStreak(s, now);
  const alive = currentStreak(s, now);
  return alive + 1;
}

/** Record today's check-in. Idempotent within a day. */
export function withCheckIn(s: StreakState, now: Date | number = Date.now()): StreakState {
  if (checkedInToday(s, now)) return s;
  return { days: [...s.days, dayKey(now)].slice(-400) };
}

/**
 * The reward for a check-in, in whole devnet SKR: 10 for showing up, +5 for every day of streak beyond the first (to a
 * cap of +40), multiplied by the tier's reward multiplier.
 */
export function checkInReward(streak: number, multiplier = 1): number {
  const bonus = Math.min(Math.max(streak - 1, 0) * 5, 40);
  return Math.round((10 + bonus) * multiplier);
}

/** The last seven days, oldest first, each marked done or not — the week strip on Today. */
export function weekStrip(s: StreakState, now: Date | number = Date.now()): { day: string; done: boolean; today: boolean }[] {
  const set = new Set(s.days);
  const today = dayKey(now);
  const out: { day: string; done: boolean; today: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = dayKey(new Date(Date.parse(`${today}T00:00:00Z`) - i * 86_400_000));
    out.push({ day: d, done: set.has(d), today: d === today });
  }
  return out;
}
