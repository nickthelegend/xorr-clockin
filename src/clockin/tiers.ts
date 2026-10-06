/**
 * SKR in xorr — earned by showing up, spent on your agent's shifts, and held for a tier.
 *
 *   - EARN: every daily clock-in pays SKR (the devnet stand-in, dSKR), more for a streak and for a Seeker.
 *   - SPEND: a premium strategy is switched on for 24 hours by paying its shift in SKR — the agent works for SKR.
 *   - HOLD: the SKR you hold sets a tier (real mainnet SKR, read-only, or dSKR on devnet — whichever is larger). A tier
 *     includes strategies outright, lowers the venue fee on every agent fill and multiplies the clock-in reward.
 *
 * No staking: nothing is locked, the loop is earn → spend → hold. Pure, so the rules are tested rather than eyeballed.
 */

export type StrategyId = 'momentum' | 'dip' | 'nightShift' | 'indexKeeper';

export type Tier = {
  id: 'free' | 'bronze' | 'silver' | 'gold';
  name: string;
  /** Whole SKR needed. */
  min: number;
  /** Venue fee on an agent fill, in basis points. */
  feeBps: number;
  /** Multiplier on the daily clock-in reward. */
  rewardX: number;
  strategies: StrategyId[];
  perk: string;
};

export const TIERS: Tier[] = [
  { id: 'free', name: 'Free', min: 0, feeBps: 30, rewardX: 1, strategies: ['momentum'], perk: 'Momentum Scout, 0.30% fee' },
  { id: 'bronze', name: 'Bronze', min: 100, feeBps: 20, rewardX: 1.5, strategies: ['momentum', 'dip'], perk: '+ Dip Buyer, 0.20% fee, 1.5× rewards' },
  {
    id: 'silver',
    name: 'Silver',
    min: 500,
    feeBps: 10,
    rewardX: 2,
    strategies: ['momentum', 'dip', 'nightShift'],
    perk: '+ Night Shift, 0.10% fee, 2× rewards',
  },
  {
    id: 'gold',
    name: 'Gold',
    min: 2_000,
    feeBps: 0,
    rewardX: 3,
    strategies: ['momentum', 'dip', 'nightShift', 'indexKeeper'],
    perk: '+ Index Keeper, no fee, 3× rewards',
  },
];

export function tierFor(skr: number): Tier {
  let t = TIERS[0]!;
  for (const x of TIERS) if (skr >= x.min) t = x;
  return t;
}

export function nextTier(skr: number): { tier: Tier; needed: number } | null {
  const next = TIERS.find((t) => t.min > skr);
  return next ? { tier: next, needed: next.min - skr } : null;
}

export type TierSource = { skr: number; source: 'devnet' | 'mainnet' | 'none' };

/**
 * The tier's SKR: the larger of the dSKR held on devnet and the real SKR the owner already holds on mainnet. A Seeker
 * owner holding SKR gets their tier on day one without moving a token; anyone else earns the devnet stand-in.
 */
export function tierSource(devnetHeld: number, mainnetHeld: number | null): TierSource {
  const held = mainnetHeld ?? 0;
  if (held <= 0 && devnetHeld <= 0) return { skr: 0, source: 'none' };
  return held > devnetHeld ? { skr: held, source: 'mainnet' } : { skr: devnetHeld, source: 'devnet' };
}

/** A premium strategy's 24-hour shift, in whole SKR. Momentum Scout is always free. */
export const SHIFT_PRICE: Record<StrategyId, number> = { momentum: 0, dip: 10, nightShift: 20, indexKeeper: 15 };
export const SHIFT_MS = 24 * 3_600_000;

export type Passes = Partial<Record<StrategyId, { until: number; sig: string }>>;

/** The strategies the agent may run now: the tier's own plus every shift paid for and not yet over. */
export function activeStrategies(tier: Tier, passes: Passes, now: number = Date.now()): StrategyId[] {
  const out = new Set<StrategyId>(tier.strategies);
  for (const [id, p] of Object.entries(passes) as [StrategyId, { until: number }][]) if (p.until > now) out.add(id);
  return (Object.keys(STRATEGY_INFO) as StrategyId[]).filter((id) => out.has(id));
}

/** The clock-in reward multiplier: the tier's, and half again for a verified Seeker (Seeker Genesis Token). */
export function rewardMultiplier(tier: Tier, seeker: boolean): number {
  return tier.rewardX * (seeker ? 1.5 : 1);
}

export const STRATEGY_INFO: Record<StrategyId, { name: string; line: string }> = {
  momentum: { name: 'Momentum Scout', line: 'Buys a stock that is up on the day, while the pool agrees with the issuer.' },
  dip: { name: 'Dip Buyer', line: 'Buys a quality name that is down on the day, once per day.' },
  nightShift: { name: 'Night Shift', line: 'While Nasdaq is shut, buys only when the pool trades under the issuer mark.' },
  indexKeeper: { name: 'Index Keeper', line: 'Keeps at least a third of the agent book in SPYx.' },
};
