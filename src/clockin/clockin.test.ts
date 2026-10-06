import { describe, expect, it } from 'vitest';
import { checkInReward, checkedInToday, currentStreak, dayKey, streakAfterCheckIn, weekStrip, withCheckIn } from './streak';
import { SHIFT_MS, TIERS, activeStrategies, nextTier, rewardMultiplier, tierFor, tierSource } from './tiers';
import { brief, decide, driftPct, nasdaqOpen, type EngineInput, type Quote } from './engine';

const day = (s: string) => new Date(`${s}T12:00:00Z`);

describe('streak', () => {
  it('counts consecutive days and survives until a whole day is missed', () => {
    let s = { days: [] as string[] };
    s = withCheckIn(s, day('2026-10-01'));
    s = withCheckIn(s, day('2026-10-02'));
    s = withCheckIn(s, day('2026-10-03'));
    expect(currentStreak(s, day('2026-10-03'))).toBe(3);
    expect(currentStreak(s, day('2026-10-04'))).toBe(3); // yesterday's streak is alive
    expect(currentStreak(s, day('2026-10-05'))).toBe(0); // a missed day breaks it
    expect(streakAfterCheckIn(s, day('2026-10-04'))).toBe(4);
    expect(streakAfterCheckIn(s, day('2026-10-06'))).toBe(1);
  });
  it('is idempotent within a day', () => {
    const s = withCheckIn({ days: [] }, day('2026-10-06'));
    expect(withCheckIn(s, day('2026-10-06'))).toBe(s);
    expect(checkedInToday(s, day('2026-10-06'))).toBe(true);
    expect(dayKey(day('2026-10-06'))).toBe('2026-10-06');
  });
  it('rewards streaks, capped, and multiplies by tier', () => {
    expect(checkInReward(1)).toBe(10);
    expect(checkInReward(3)).toBe(20);
    expect(checkInReward(100)).toBe(50);
    expect(checkInReward(3, 2)).toBe(40);
  });
  it('draws the last seven days', () => {
    const s = { days: ['2026-10-04', '2026-10-06'] };
    const w = weekStrip(s, day('2026-10-06'));
    expect(w).toHaveLength(7);
    expect(w[6]).toEqual({ day: '2026-10-06', done: true, today: true });
    expect(w.filter((d) => d.done)).toHaveLength(2);
  });
});

describe('tiers', () => {
  it('climbs the ladder', () => {
    expect(tierFor(0).id).toBe('free');
    expect(tierFor(100).id).toBe('bronze');
    expect(tierFor(499).id).toBe('bronze');
    expect(tierFor(500).id).toBe('silver');
    expect(tierFor(10_000).id).toBe('gold');
    expect(nextTier(120)).toEqual({ tier: TIERS[2], needed: 380 });
    expect(nextTier(5000)).toBeNull();
  });
  it('takes the larger of devnet dSKR and real mainnet SKR', () => {
    expect(tierSource(0, null)).toEqual({ skr: 0, source: 'none' });
    expect(tierSource(300, 50)).toEqual({ skr: 300, source: 'devnet' });
    expect(tierSource(300, 900)).toEqual({ skr: 900, source: 'mainnet' });
  });
  it('adds paid shifts to the tier, until they run out', () => {
    const now = 1_000_000;
    expect(activeStrategies(TIERS[0]!, {}, now)).toEqual(['momentum']);
    const passes = { nightShift: { until: now + SHIFT_MS, sig: 'x' }, dip: { until: now - 1, sig: 'y' } };
    expect(activeStrategies(TIERS[0]!, passes, now)).toEqual(['momentum', 'nightShift']);
    expect(activeStrategies(TIERS[3]!, {}, now)).toHaveLength(4);
  });
  it('gives a verified Seeker half again', () => {
    expect(rewardMultiplier(TIERS[0]!, false)).toBe(1);
    expect(rewardMultiplier(TIERS[2]!, true)).toBe(3);
  });
});

describe('engine', () => {
  // Tuesday 2026-10-06 15:00 UTC = 11:00 ET, in session.
  const inSession = new Date('2026-10-06T15:00:00Z');
  const night = new Date('2026-10-06T03:00:00Z');
  const q = (symbol: string, usd: number, change24h: number | null, mark: number | null = usd): Quote => ({ symbol, usd, change24h, mark });
  const base = (over: Partial<EngineInput> = {}): EngineInput => ({
    quotes: {},
    holdings: {},
    allowanceUsd: 100,
    cashUsd: 1000,
    strategies: ['momentum'],
    perTradeUsd: 25,
    boughtToday: [],
    now: inSession,
    ...over,
  });

  it('knows the Nasdaq session, DST included', () => {
    expect(nasdaqOpen(inSession)).toBe(true);
    expect(nasdaqOpen(night)).toBe(false);
    expect(nasdaqOpen(new Date('2026-10-10T15:00:00Z'))).toBe(false); // Saturday
    expect(nasdaqOpen(new Date('2026-12-07T14:45:00Z'))).toBe(true); // EST: 09:45
    expect(nasdaqOpen(new Date('2026-12-07T14:15:00Z'))).toBe(false); // EST: 09:15
  });

  it('buys momentum inside the permission and explains why', () => {
    const d = decide(base({ quotes: { NVDAx: q('NVDAx', 240, 1.7) } }));
    expect(d[0]).toMatchObject({ symbol: 'NVDAx', action: 'buy', usd: 25, strategy: 'momentum' });
    expect(d[0]!.reason).toMatch(/Up \+1\.70%/);
  });

  it('never spends more than the allowance left', () => {
    const d = decide(base({ allowanceUsd: 30, quotes: { NVDAx: q('NVDAx', 240, 2), TSLAx: q('TSLAx', 380, 2) } }));
    expect(d.map((x) => x.usd ?? 0).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(30);
    expect(d[1]).toMatchObject({ action: 'buy', usd: 5 });
    const none = decide(base({ allowanceUsd: 0, quotes: { NVDAx: q('NVDAx', 240, 2) } }));
    expect(none[0]).toMatchObject({ action: 'hold' });
    expect(none[0]!.reason).toMatch(/permission has nothing left/);
  });

  it('holds when the pool has come apart from the issuer', () => {
    const d = decide(base({ quotes: { NVDAx: q('NVDAx', 245, 3, 240) } }));
    expect(d[0]!.action).toBe('hold');
    expect(d[0]!.reason).toMatch(/^Guard/);
    expect(driftPct(q('X', 101, 0, 100))).toBeCloseTo(1);
  });

  it('closes at take-profit and stop before anything else', () => {
    const tp = decide(base({ quotes: { NVDAx: q('NVDAx', 105, 2) }, holdings: { NVDAx: { symbol: 'NVDAx', qty: 1, cost: 100 } } }));
    expect(tp[0]).toMatchObject({ action: 'sell', qty: 1, strategy: 'exit' });
    const sl = decide(base({ quotes: { NVDAx: q('NVDAx', 96, -4) }, holdings: { NVDAx: { symbol: 'NVDAx', qty: 1, cost: 100 } } }));
    expect(sl[0]!.reason).toMatch(/^Stop/);
  });

  it('paces: one entry per stock per day', () => {
    const d = decide(base({ boughtToday: ['NVDAx'], quotes: { NVDAx: q('NVDAx', 240, 2) } }));
    expect(d[0]!.action).toBe('hold');
  });

  it('unlocks strategies by tier', () => {
    const quotes = { TSLAx: q('TSLAx', 380, -2) };
    expect(decide(base({ quotes }))[0]!.action).toBe('hold');
    expect(decide(base({ quotes, strategies: ['momentum', 'dip'] }))[0]).toMatchObject({ action: 'buy', strategy: 'dip' });
    const nightQuotes = { AAPLx: q('AAPLx', 99, 0, 100) };
    expect(decide(base({ now: night, quotes: nightQuotes, strategies: ['momentum', 'dip', 'nightShift'] }))[0]).toMatchObject({
      action: 'buy',
      strategy: 'nightShift',
    });
  });

  it('writes a brief from the numbers', () => {
    const quotes = { NVDAx: q('NVDAx', 110, 1) };
    const b = brief({
      quotes,
      holdings: { NVDAx: { symbol: 'NVDAx', qty: 1, cost: 100 } },
      previous: { NVDAx: 100 },
      cashUsd: 0,
      streak: 3,
      decisions: [],
      now: inSession,
      permissionLive: true,
    });
    expect(b.mood).toBe('up');
    expect(b.headline).toMatch(/up \$10\.00/);
    expect(b.lines.join(' ')).toMatch(/NVDAx \+10\.00%/);
    expect(b.lines.join(' ')).toMatch(/3-day streak/);
  });
});
