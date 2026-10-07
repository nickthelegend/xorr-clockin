/**
 * The agent's mind — the CLOCK IN build's on-device trading agent.
 *
 * Pure: prices, holdings and the permission go in; decisions, each with the reason in words, come out. Nothing here
 * signs or sends; `actions.ts` executes what this decides, through the delegate permission, on devnet.
 *
 * The rules are the hosted executor's, cut down to what a phone can check on its own:
 *   - exits first: take profit at +4%, stop at −3% against the cost of the position;
 *   - the guard: never enter while the pool and the issuer's own mark disagree by more than 1.5% (1.2% in session),
 *     because a tokenized stock that has come apart from its share is not a price, it is a gap;
 *   - pacing: one entry per stock per day, at most three entries a look, each at most the per-trade size;
 *   - the permission: never more than what is left of the allowance, never more than the wallet holds.
 */
import { STRATEGY_INFO, type StrategyId } from './tiers';

export type Quote = {
  symbol: string;
  /** The pool price on Solana mainnet (Jupiter), USD. */
  usd: number;
  /** Jupiter's 24h change, percent. */
  change24h: number | null;
  /** The issuer's own mark for the share (xStocks), USD — the second opinion. */
  mark: number | null;
};

export type Holding = { symbol: string; qty: number; cost: number };

export type Decision = {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  usd?: number;
  qty?: number;
  strategy?: StrategyId | 'exit';
  reason: string;
};

export type EngineInput = {
  quotes: Record<string, Quote>;
  holdings: Record<string, Holding>;
  /** What the delegate may still move, in dUSDC. */
  allowanceUsd: number;
  /** What the wallet holds, in dUSDC. */
  cashUsd: number;
  strategies: StrategyId[];
  perTradeUsd: number;
  /** Symbols the agent already entered today. */
  boughtToday: string[];
  now: Date;
};

export const TAKE_PROFIT_PCT = 4;
export const STOP_PCT = -3;
export const MOMENTUM_PCT = 0.5;
export const DIP_PCT = -0.75;
export const MAX_ENTRIES_PER_LOOK = 3;
export const MIN_TRADE_USD = 1;

/** US Eastern offset for a UTC instant: −4 in daylight time (2nd Sunday of March → 1st Sunday of November), else −5. */
export function easternOffsetHours(at: Date): number {
  const y = at.getUTCFullYear();
  const nthSunday = (month: number, n: number) => {
    const first = new Date(Date.UTC(y, month, 1));
    const day = first.getUTCDay();
    return 1 + ((7 - day) % 7) + (n - 1) * 7;
  };
  // DST starts 2:00 local (07:00 UTC) and ends 2:00 local (06:00 UTC).
  const start = Date.UTC(y, 2, nthSunday(2, 2), 7);
  const end = Date.UTC(y, 10, nthSunday(10, 1), 6);
  const t = at.getTime();
  return t >= start && t < end ? -4 : -5;
}

/** Whether Nasdaq's regular session is open (weekdays 09:30–16:00 ET; holidays not modelled). */
export function nasdaqOpen(at: Date): boolean {
  const et = new Date(at.getTime() + easternOffsetHours(at) * 3_600_000);
  const dow = et.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const mins = et.getUTCHours() * 60 + et.getUTCMinutes();
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

/** Pool against the issuer's mark, in percent (positive: the pool trades above the share). */
export function driftPct(q: Quote): number | null {
  if (!q.mark || q.mark <= 0) return null;
  return ((q.usd - q.mark) / q.mark) * 100;
}

export function pnlPct(h: Holding, q: Quote): number | null {
  if (h.qty <= 0 || h.cost <= 0) return null;
  return ((h.qty * q.usd - h.cost) / h.cost) * 100;
}

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

/** One look: what the agent would do right now, for every stock it watches. */
export function decide(input: EngineInput): Decision[] {
  const out: Decision[] = [];
  const open = nasdaqOpen(input.now);
  const guard = open ? 1.2 : 1.5;
  let allowance = input.allowanceUsd;
  let cash = input.cashUsd;
  let entries = 0;

  const bookValue = Object.values(input.holdings).reduce((s, h) => s + h.qty * (input.quotes[h.symbol]?.usd ?? 0), 0);
  const spyValue = (input.holdings.SPYx?.qty ?? 0) * (input.quotes.SPYx?.usd ?? 0);

  for (const q of Object.values(input.quotes)) {
    const h = input.holdings[q.symbol];

    // Exits first: a position that hit its level is closed before anything new is opened.
    if (h && h.qty > 0) {
      const p = pnlPct(h, q);
      if (p !== null && p >= TAKE_PROFIT_PCT) {
        out.push({ symbol: q.symbol, action: 'sell', qty: h.qty, strategy: 'exit', reason: `Take profit: ${pct(p)} on the position (target +${TAKE_PROFIT_PCT}%).` });
        continue;
      }
      if (p !== null && p <= STOP_PCT) {
        out.push({ symbol: q.symbol, action: 'sell', qty: h.qty, strategy: 'exit', reason: `Stop: ${pct(p)} on the position (stop ${STOP_PCT}%).` });
        continue;
      }
    }

    const drift = driftPct(q);
    if (drift !== null && Math.abs(drift) > guard) {
      out.push({
        symbol: q.symbol,
        action: 'hold',
        reason: `Guard: the pool is ${pct(drift)} from the issuer's mark (limit ±${guard}%${open ? ', in session' : ', Nasdaq shut'}). Not a price I trust.`,
      });
      continue;
    }

    // Which strategy, if any, wants in — in the order a person would read them.
    const c = q.change24h;
    let want: { strategy: StrategyId; reason: string } | null = null;
    if (!want && input.strategies.includes('nightShift') && !open && drift !== null && drift < -0.3) {
      want = { strategy: 'nightShift', reason: `Nasdaq is shut and the pool is ${pct(drift)} under the issuer's mark — buying the discount.` };
    }
    if (!want && input.strategies.includes('momentum') && c !== null && c >= MOMENTUM_PCT) {
      want = { strategy: 'momentum', reason: `Up ${pct(c)} on the day with the pool in line with the issuer (${drift === null ? 'no mark' : pct(drift)}).` };
    }
    if (!want && input.strategies.includes('dip') && c !== null && c <= DIP_PCT) {
      want = { strategy: 'dip', reason: `Down ${pct(c)} on the day — a dip in a name the book wants to own.` };
    }
    if (!want && q.symbol === 'SPYx' && input.strategies.includes('indexKeeper') && (bookValue <= 0 || spyValue / bookValue < 1 / 3)) {
      want = { strategy: 'indexKeeper', reason: `SPYx is ${bookValue > 0 ? ((spyValue / bookValue) * 100).toFixed(0) : 0}% of the book; the keeper holds at least a third.` };
    }

    if (!want) {
      const why =
        c === null
          ? 'No 24h change to read.'
          : `${pct(c)} on the day — nothing in ${input.strategies.map((s) => STRATEGY_INFO[s].name).join(', ')} fires.`;
      out.push({ symbol: q.symbol, action: 'hold', reason: why });
      continue;
    }
    if (input.boughtToday.includes(q.symbol)) {
      out.push({ symbol: q.symbol, action: 'hold', strategy: want.strategy, reason: `${STRATEGY_INFO[want.strategy].name} likes it, but I already entered ${q.symbol} today.` });
      continue;
    }
    if (entries >= MAX_ENTRIES_PER_LOOK) {
      out.push({ symbol: q.symbol, action: 'hold', strategy: want.strategy, reason: `Three entries this look already; ${q.symbol} waits for the next one.` });
      continue;
    }
    const usd = Math.floor(Math.min(input.perTradeUsd, allowance, cash) * 100) / 100;
    if (usd < MIN_TRADE_USD) {
      const short = allowance < cash ? 'the permission has nothing left' : 'the wallet is out of dUSDC';
      out.push({ symbol: q.symbol, action: 'hold', strategy: want.strategy, reason: `${STRATEGY_INFO[want.strategy].name} likes it, but ${short}.` });
      continue;
    }
    allowance -= usd;
    cash -= usd;
    entries++;
    out.push({ symbol: q.symbol, action: 'buy', usd, strategy: want.strategy, reason: want.reason });
  }
  return out;
}

export type Brief = { headline: string; lines: string[]; mood: 'up' | 'down' | 'flat' };

export type BriefInput = {
  quotes: Record<string, Quote>;
  holdings: Record<string, Holding>;
  /** Prices at the last check-in, to say what moved since. */
  previous: Record<string, number> | null;
  cashUsd: number;
  streak: number;
  decisions: Decision[];
  now: Date;
  permissionLive: boolean;
};

/** The day's brief, written from the numbers — the first thing the owner reads when they clock in. */
export function brief(input: BriefInput): Brief {
  const lines: string[] = [];
  const qs = Object.values(input.quotes);
  const open = nasdaqOpen(input.now);

  const value = Object.values(input.holdings).reduce((s, h) => s + h.qty * (input.quotes[h.symbol]?.usd ?? 0), 0);
  const cost = Object.values(input.holdings).reduce((s, h) => s + h.cost, 0);
  const pnl = value - cost;

  let headline: string;
  let mood: Brief['mood'] = 'flat';
  if (cost > 0) {
    mood = pnl > 0.005 ? 'up' : pnl < -0.005 ? 'down' : 'flat';
    headline = `Your agent's book is ${pnl >= 0 ? 'up' : 'down'} $${Math.abs(pnl).toFixed(2)} (${pct((pnl / cost) * 100)}) on $${cost.toFixed(2)} in.`;
  } else {
    const best = [...qs].filter((q) => q.change24h !== null).sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))[0];
    headline = best ? `No positions yet. ${best.symbol} leads the day at ${pct(best.change24h!)}.` : 'No positions yet, and no prices to read.';
  }

  lines.push(open ? 'Nasdaq is open — pool and issuer should agree closely.' : 'Nasdaq is shut — xStocks still trade on Solana, so the guard is watching the gap.');

  if (input.previous) {
    const moves = qs
      .map((q) => ({ s: q.symbol, d: input.previous![q.symbol] ? ((q.usd - input.previous![q.symbol]!) / input.previous![q.symbol]!) * 100 : null }))
      .filter((m): m is { s: string; d: number } => m.d !== null)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    if (moves[0]) lines.push(`Since your last clock-in: ${moves.slice(0, 3).map((m) => `${m.s} ${pct(m.d)}`).join(', ')}.`);
  } else {
    const movers = qs.filter((q) => q.change24h !== null).sort((a, b) => Math.abs(b.change24h!) - Math.abs(a.change24h!));
    if (movers[0]) lines.push(`Biggest moves today: ${movers.slice(0, 3).map((m) => `${m.symbol} ${pct(m.change24h!)}`).join(', ')}.`);
  }

  const buys = input.decisions.filter((d) => d.action === 'buy');
  const sells = input.decisions.filter((d) => d.action === 'sell');
  const guarded = input.decisions.filter((d) => d.reason.startsWith('Guard'));
  if (!input.permissionLive) lines.push('I have no permission right now, so I am only watching. Give me one from Safety and I start working.');
  else if (buys.length || sells.length)
    lines.push(
      `Plan: ${[...buys.map((b) => `buy $${b.usd!.toFixed(0)} ${b.symbol}`), ...sells.map((s) => `close ${s.symbol}`)].join(', ')}.`,
    );
  else lines.push('Plan: nothing meets the rules right now. I hold — doing nothing is a decision too.');
  if (guarded.length) lines.push(`Guard is holding back ${guarded.map((g) => g.symbol).join(', ')}.`);
  if (input.streak > 1) lines.push(`${input.streak}-day streak. Keep it going tomorrow.`);
  return { headline, lines, mood };
}
