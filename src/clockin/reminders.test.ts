import { describe, expect, it } from 'vitest';
import { streakReminderAt } from './notify';

const plan = (checkedInToday: boolean) => ({ on: true, briefAt: { hour: 8, minute: 30 }, streak: 3, checkedInToday });

describe('the evening streak reminder', () => {
  it('fires tonight at 20:00 while today is still open', () => {
    const now = new Date(2026, 9, 7, 9, 0);
    const at = streakReminderAt(plan(false), now);
    expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([7, 20, 0]);
  });
  it('moves to tomorrow once you clocked in, or once 20:00 has passed', () => {
    expect(streakReminderAt(plan(true), new Date(2026, 9, 7, 9, 0)).getDate()).toBe(8);
    expect(streakReminderAt(plan(false), new Date(2026, 9, 7, 21, 0)).getDate()).toBe(8);
  });
});
