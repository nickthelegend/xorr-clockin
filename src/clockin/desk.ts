/**
 * The live desk: what the chain and the market say right now, shared by every CLOCK IN screen, and the actions that
 * change it. Each action is one devnet transaction (or one per trade), logged to the activity trail with its signature.
 */
import { create } from 'zustand';
import { Keypair, PublicKey } from '@solana/web3.js';
import { DEVNET, STARTER_SKR, STARTER_USDC, STOCKS, stockBySymbol } from './config';
import {
  ChainRefused,
  agentBuyIxs,
  agentKeypair,
  agentSellIxs,
  airdropSol,
  checkInIxs,
  fundStarterIxs,
  grantIxs,
  mintSkrIxs,
  overCapIxs,
  payShiftIxs,
  permissionOf,
  readMainnetSkr,
  readOwner,
  readSeekerGenesis,
  revokeIxs,
  send,
  type ChainView,
} from './chain';
import { brief as writeBrief, decide, type Brief, type Decision, type Holding } from './engine';
import { fetchPrices, type Prices } from './prices';
import { boughtToday, useClockin } from './session';
import { checkInReward, checkedInToday, currentStreak, dayKey, streakAfterCheckIn, withCheckIn } from './streak';
import { SHIFT_MS, SHIFT_PRICE, STRATEGY_INFO, activeStrategies, rewardMultiplier, tierFor, tierSource, type StrategyId } from './tiers';
import { notifyNow, scheduleDailyBrief } from './notify';
import type { Owner } from './useOwner';

type Live = {
  view: ChainView | null;
  prices: Prices | null;
  mainnetSkr: number | null;
  /** The Seeker Genesis Token mint, null for none, undefined while unread. */
  sgt: string | null | undefined;
  agent: string | null;
  loading: boolean;
  error: string | null;
  busy: string | null;
};

export const useLive = create<Live>(() => ({
  view: null,
  prices: null,
  mainnetSkr: null,
  sgt: undefined,
  agent: null,
  loading: false,
  error: null,
  busy: null,
}));

let agentCache: Keypair | null = null;
export async function agent(): Promise<Keypair> {
  if (!agentCache) agentCache = await agentKeypair();
  useLive.setState({ agent: agentCache.publicKey.toBase58() });
  return agentCache;
}

/** Re-read the chain and the market. Mainnet reads (SKR, Seeker token) run once per owner and never block. */
export async function refresh(owner: PublicKey, opts: { mainnet?: boolean } = {}): Promise<void> {
  useLive.setState({ loading: true, error: null });
  await agent();
  const [view, prices] = await Promise.allSettled([readOwner(owner), fetchPrices()]);
  useLive.setState({
    view: view.status === 'fulfilled' ? view.value : useLive.getState().view,
    prices: prices.status === 'fulfilled' ? prices.value : useLive.getState().prices,
    loading: false,
    error:
      view.status === 'rejected'
        ? `Devnet could not be read: ${String((view.reason as Error)?.message ?? view.reason)}`
        : prices.status === 'rejected'
          ? `Prices could not be read: ${String((prices.reason as Error)?.message ?? prices.reason)}`
          : null,
  });
  // eslint-disable-next-line no-console
  if (__DEV__ && useLive.getState().error) console.log(`[clockin] refresh: ${useLive.getState().error}`);
  if (opts.mainnet) {
    void readMainnetSkr(owner).then((mainnetSkr) => useLive.setState({ mainnetSkr }));
    void readSeekerGenesis(owner).then((sgt) => useLive.setState({ sgt }));
  }
}

/* ---------------------------------------------------------------------------------------------------- derived */

export function holdingsFrom(view: ChainView | null, prices: Prices | null): Record<string, Holding> {
  const ledger = useClockin.getState().ledger;
  const out: Record<string, Holding> = {};
  if (!view) return out;
  for (const s of STOCKS) {
    const t = view.stocks[s.symbol];
    if (!t || t.raw <= 0n) continue;
    const qty = t.ui;
    const entry = ledger[s.symbol];
    const ledgerQty = entry ? Number(BigInt(entry.qtyRaw)) / 10 ** s.decimals : 0;
    const price = prices?.quotes[s.symbol]?.usd ?? 0;
    // The chain holds the quantity; the ledger holds what was paid. Scale the cost if the two disagree.
    const cost = entry && ledgerQty > 0 ? entry.cost * (qty / ledgerQty) : qty * price;
    out[s.symbol] = { symbol: s.symbol, qty, cost };
  }
  return out;
}

export type Standing = {
  tier: ReturnType<typeof tierFor>;
  source: ReturnType<typeof tierSource>;
  strategies: StrategyId[];
  permission: ReturnType<typeof permissionOf>;
  holdings: Record<string, Holding>;
  cashUsd: number;
  skrHeld: number;
  bookValue: number;
  bookCost: number;
  seeker: boolean;
};

export function standing(live: Live, passes = useClockin.getState().passes): Standing {
  const skrHeld = live.view?.skr.ui ?? 0;
  const source = tierSource(skrHeld, live.mainnetSkr);
  const tier = tierFor(source.skr);
  const holdings = holdingsFrom(live.view, live.prices);
  const bookValue = Object.values(holdings).reduce((s, h) => s + h.qty * (live.prices?.quotes[h.symbol]?.usd ?? 0), 0);
  const bookCost = Object.values(holdings).reduce((s, h) => s + h.cost, 0);
  return {
    tier,
    source,
    strategies: activeStrategies(tier, passes),
    permission: permissionOf(
      live.view ?? ({ usdc: { delegate: null, delegatedRaw: 0n } } as unknown as ChainView),
      live.agent ? new PublicKey(live.agent) : null,
    ),
    holdings,
    cashUsd: live.view?.usdc.ui ?? 0,
    skrHeld,
    bookValue,
    bookCost,
    seeker: !!live.sgt,
  };
}

export function plan(live: Live): { decisions: Decision[]; brief: Brief } {
  const st = standing(live);
  const quotes = live.prices?.quotes ?? {};
  const decisions = decide({
    quotes,
    holdings: st.holdings,
    allowanceUsd: st.permission.leftUsd,
    cashUsd: st.cashUsd,
    strategies: st.strategies,
    perTradeUsd: useClockin.getState().perTradeUsd,
    boughtToday: boughtToday(),
    now: new Date(),
  });
  const s = useClockin.getState();
  return {
    decisions,
    brief: writeBrief({
      quotes,
      holdings: st.holdings,
      previous: s.snapshot?.prices ?? null,
      cashUsd: st.cashUsd,
      streak: currentStreak(s.streak),
      decisions,
      now: new Date(),
      permissionLive: st.permission.live,
    }),
  };
}

/* ---------------------------------------------------------------------------------------------------- actions */

async function guarded<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (useLive.getState().busy) throw new Error(`Still working on: ${useLive.getState().busy}`);
  useLive.setState({ busy: label });
  try {
    return await fn();
  } finally {
    useLive.setState({ busy: null });
  }
}

const log = (...a: Parameters<ReturnType<typeof useClockin.getState>['log']>) => useClockin.getState().log(...a);

/** A new wallet's starter money: dUSDC to trade, its token accounts made — the faucet pays, nothing to sign. */
export async function fundStarter(owner: Owner): Promise<string> {
  return guarded('Funding your devnet wallet', async () => {
    const sig = await send(fundStarterIxs(owner.pubkey, STARTER_USDC));
    useClockin.getState().set({ funded: true });
    log({ kind: 'fund', title: `+${STARTER_USDC} dUSDC from the devnet faucet`, detail: 'Test money for the agent to trade. No signature needed.', sig, ok: true });
    await refresh(owner.pubkey);
    return sig;
  });
}

export async function claimStarterSkr(owner: Owner): Promise<string> {
  return guarded('Claiming starter SKR', async () => {
    const sig = await send(mintSkrIxs(owner.pubkey, STARTER_SKR, `xorr clockin: starter ${STARTER_SKR} dSKR (devnet stand-in for SKR)`));
    useClockin.getState().set({ starterSkr: true });
    log({ kind: 'skr', title: `+${STARTER_SKR} dSKR welcome grant`, detail: 'Devnet stand-in for SKR.', sig, ok: true });
    await refresh(owner.pubkey);
    return sig;
  });
}

export type CheckInResult = { sig: string; reward: number; streak: number; brief: Brief; trades: TradeResult[] };

/** The daily clock-in: the owner signs a memo, the reward lands, the brief is written, and the agent takes a look. */
export async function checkIn(owner: Owner): Promise<CheckInResult> {
  const s = useClockin.getState();
  if (checkedInToday(s.streak)) throw new Error('Already clocked in today. Come back tomorrow.');
  const result = await guarded('Clocking in', async () => {
    await refresh(owner.pubkey);
    const live = useLive.getState();
    const st = standing(live);
    const streak = streakAfterCheckIn(s.streak);
    const reward = checkInReward(streak, rewardMultiplier(st.tier, st.seeker));
    const { brief } = plan(live); // written against the LAST clock-in's prices, before they are replaced
    const sig = await send(checkInIxs(owner.pubkey, dayKey(), streak, reward), { owner });
    useClockin.getState().setStreak(withCheckIn(useClockin.getState().streak));
    if (live.prices) useClockin.getState().setSnapshot(Object.fromEntries(Object.values(live.prices.quotes).map((q) => [q.symbol, q.usd])));
    useClockin.getState().set({ lastBrief: { ...brief, at: Date.now(), by: 'engine' } });
    log({ kind: 'checkin', title: `Clocked in · day ${streak} · +${reward} dSKR`, detail: brief.headline, sig, ok: true });
    void scheduleDailyBrief(streak);
    return { sig, reward, streak, brief };
  });
  // The agent's look is its own step, so a refusal there never undoes the clock-in.
  const trades = standing(useLive.getState()).permission.live ? await agentLook(owner).catch(() => []) : [];
  return { ...result, trades };
}

/** Grant the agent its permission: one owner signature. */
export async function grant(owner: Owner, capUsd: number): Promise<string> {
  return guarded('Granting the permission', async () => {
    const a = await agent();
    const sig = await send(grantIxs(owner.pubkey, a.publicKey, capUsd), { owner });
    log({ kind: 'grant', title: `Permission granted: ${capUsd} dUSDC`, detail: `SPL ApproveChecked to the agent ${a.publicKey.toBase58().slice(0, 6)}…, plus sell approvals so exits can fire.`, sig, ok: true });
    await refresh(owner.pubkey);
    return sig;
  });
}

/** The stop: revoke every approval that names the agent. */
export async function revoke(owner: Owner): Promise<string> {
  return guarded('Revoking', async () => {
    await refresh(owner.pubkey);
    const view = useLive.getState().view;
    if (!view) throw new Error('Devnet could not be read.');
    const sig = await send(revokeIxs(owner.pubkey, view), { owner });
    log({ kind: 'revoke', title: 'Permission revoked', detail: 'SPL Revoke on every account. The agent can move nothing now.', sig, ok: true });
    await refresh(owner.pubkey);
    return sig;
  });
}

export type TradeResult = { decision: Decision; sig?: string; error?: string };

/** One look by the agent: decide, then execute every buy and sell through the delegate, each its own transaction. */
export async function agentLook(owner: Owner, only?: { symbol: string; usd: number }): Promise<TradeResult[]> {
  return guarded('Agent is looking', async () => {
    await refresh(owner.pubkey);
    const live = useLive.getState();
    const st = standing(live);
    const a = await agent();
    let decisions: Decision[];
    if (only) {
      const q = live.prices?.quotes[only.symbol];
      decisions = q ? [{ symbol: only.symbol, action: 'buy', usd: Math.min(only.usd, st.permission.leftUsd, st.cashUsd), reason: `You asked me to buy $${only.usd} of ${only.symbol}.` }] : [];
    } else decisions = plan(live).decisions;

    const out: TradeResult[] = [];
    for (const d of decisions) {
      if (d.action === 'hold') {
        out.push({ decision: d });
        continue;
      }
      const q = live.prices?.quotes[d.symbol];
      const def = stockBySymbol(d.symbol);
      if (!q || !def) continue;
      try {
        if (d.action === 'buy') {
          if (!st.permission.live) throw new Error('No permission: grant one first.');
          if (!d.usd || d.usd < 1) throw new Error('Nothing left to spend.');
          const { ixs, qtyRaw } = agentBuyIxs(owner.pubkey, a.publicKey, d.symbol, d.usd, q.usd, st.tier.feeBps, `xorr agent buy ${d.symbol} $${d.usd.toFixed(2)} @ ${q.usd.toFixed(2)}: ${d.reason}`);
          const sig = await send(ixs, { signers: [a] });
          useClockin.getState().recordBuy(d.symbol, qtyRaw, d.usd);
          log({ kind: 'buy', title: `Agent bought $${d.usd.toFixed(2)} ${d.symbol}`, detail: d.reason, sig, ok: true });
          out.push({ decision: d, sig });
        } else {
          const t = live.view?.stocks[d.symbol];
          if (!t || t.raw <= 0n) continue;
          const { ixs, outRaw } = agentSellIxs(owner.pubkey, a.publicKey, d.symbol, t.raw, q.usd, st.tier.feeBps, `xorr agent sell ${d.symbol} @ ${q.usd.toFixed(2)}: ${d.reason}`);
          const sig = await send(ixs, { signers: [a] });
          useClockin.getState().recordSell(d.symbol);
          log({ kind: 'sell', title: `Agent sold ${d.symbol} for $${(Number(outRaw) / 10 ** DEVNET.usdcDecimals).toFixed(2)}`, detail: d.reason, sig, ok: true });
          out.push({ decision: d, sig });
        }
      } catch (e) {
        const msg = e instanceof ChainRefused ? `${e.message}` : e instanceof Error ? e.message : String(e);
        log({ kind: 'refused', title: `Agent ${d.action} ${d.symbol} refused`, detail: msg, sig: e instanceof ChainRefused ? e.signature : undefined, ok: false });
        out.push({ decision: d, error: msg, sig: e instanceof ChainRefused ? e.signature : undefined });
      }
    }
    useClockin.getState().set({ lastLookAt: Date.now() });
    const traded = out.filter((r) => r.sig && !r.error);
    if (traded.length) void notifyNow(`Your agent made ${traded.length} trade${traded.length > 1 ? 's' : ''}`, traded.map((t) => `${t.decision.action} ${t.decision.symbol}`).join(' · '));
    else log({ kind: 'look', title: 'Agent looked — no trade', detail: out[0]?.decision.reason ?? 'Nothing to read.', ok: true });
    await refresh(owner.pubkey);
    return out;
  });
}

/** Ask the agent to move more than it was allowed. The token program refuses — and the refusal lands on devnet. */
export async function testCap(owner: Owner): Promise<{ sig: string; message: string }> {
  return guarded('Testing the cap', async () => {
    await refresh(owner.pubkey);
    const st = standing(useLive.getState());
    const a = await agent();
    const over = Math.floor(st.permission.leftUsd) + 50;
    try {
      const sig = await send(overCapIxs(owner.pubkey, a.publicKey, over), { signers: [a], skipPreflight: true });
      // It should never get here.
      log({ kind: 'refused', title: 'Cap test: the chain ACCEPTED an over-cap move', detail: `${over} dUSDC`, sig, ok: false });
      return { sig, message: 'Unexpected: the transfer went through.' };
    } catch (e) {
      if (!(e instanceof ChainRefused)) throw e;
      const why = e.logs.find((l) => /insufficient|owner does not match|Error/i.test(l)) ?? e.message;
      log({ kind: 'refused', title: `Cap held: agent tried ${over} dUSDC, chain refused`, detail: why, sig: e.signature, ok: true });
      return { sig: e.signature, message: why };
    }
  });
}

/** Buy a strategy's 24-hour shift with SKR. */
export async function buyShift(owner: Owner, strategy: StrategyId): Promise<string> {
  return guarded('Paying the shift', async () => {
    const price = SHIFT_PRICE[strategy];
    const live = useLive.getState();
    if ((live.view?.skr.ui ?? 0) < price) throw new Error(`The ${STRATEGY_INFO[strategy].name} shift costs ${price} dSKR. Clock in to earn more.`);
    const sig = await send(payShiftIxs(owner.pubkey, price, STRATEGY_INFO[strategy].name), { owner });
    const passes = { ...useClockin.getState().passes, [strategy]: { until: Date.now() + SHIFT_MS, sig } };
    useClockin.getState().set({ passes });
    log({ kind: 'shift', title: `${STRATEGY_INFO[strategy].name} hired for 24h · −${price} dSKR`, detail: 'Paid to the xorr treasury in the devnet SKR stand-in.', sig, ok: true });
    await refresh(owner.pubkey);
    return sig;
  });
}

export async function getDevnetSol(owner: Owner): Promise<string> {
  return guarded('Requesting devnet SOL', async () => {
    const sig = await airdropSol(owner.pubkey, 0.5);
    log({ kind: 'airdrop', title: '+0.5 devnet SOL', sig, ok: true });
    await refresh(owner.pubkey);
    return sig;
  });
}
