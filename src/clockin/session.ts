/**
 * What the CLOCK IN build remembers on the device: which wallet is connected, the streak, the agent's ledger (cost
 * basis per stock, what it entered today), the price snapshot from the last clock-in, and an activity trail with a
 * devnet explorer link for every transaction. Balances, the permission and the stake are never remembered — they are
 * read from the chain every time.
 *
 * Secrets are not here: the guest key and the agent key are in the OS keystore (`secret.native.ts`), the MWA auth
 * token is a session token (not a key) and is kept here so the wallet reauthorizes silently.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MwaAuth } from './mwa';
import type { StreakState } from './streak';
import type { Passes } from './tiers';
import { dayKey } from './streak';

export type WalletKind = 'mwa' | 'guest' | 'privy';

export type ConnectedWallet = { kind: WalletKind; address: string; mwa?: MwaAuth; label?: string };

export type ActivityKind = 'fund' | 'checkin' | 'grant' | 'revoke' | 'buy' | 'sell' | 'refused' | 'shift' | 'skr' | 'airdrop' | 'look';

export type Activity = {
  id: string;
  at: number;
  kind: ActivityKind;
  title: string;
  detail?: string;
  sig?: string;
  ok: boolean;
};

export type LedgerEntry = { qtyRaw: string; cost: number };

type State = {
  wallet: ConnectedWallet | null;
  streak: StreakState;
  activity: Activity[];
  /** Cost basis, per stock symbol. Quantity is re-read from the chain; this keeps what was paid. */
  ledger: Record<string, LedgerEntry>;
  /** Stocks the agent entered on `boughtDay`. */
  bought: { day: string; symbols: string[] };
  snapshot: { at: number; prices: Record<string, number> } | null;
  perTradeUsd: number;
  funded: boolean;
  starterSkr: boolean;
  lastLookAt: number | null;
  /** Strategy shifts paid for in SKR, with the paying transaction. */
  passes: Passes;
  /** The model used when the owner adds their own OpenRouter key (kept in the keystore, not here). */
  aiModel: string;
  /** The last brief, so Today opens on it instead of a spinner. */
  lastBrief: { headline: string; lines: string[]; mood: 'up' | 'down' | 'flat'; at: number; by: 'engine' | 'ai' } | null;
};

type Actions = {
  connect: (w: ConnectedWallet) => void;
  updateMwa: (auth: MwaAuth) => void;
  disconnect: () => void;
  log: (a: Omit<Activity, 'id' | 'at'> & { at?: number }) => void;
  setStreak: (s: StreakState) => void;
  recordBuy: (symbol: string, qtyRaw: bigint, cost: number) => void;
  recordSell: (symbol: string) => void;
  setSnapshot: (prices: Record<string, number>) => void;
  set: (p: Partial<State>) => void;
};

const fresh = (): State => ({
  wallet: null,
  streak: { days: [] },
  activity: [],
  ledger: {},
  bought: { day: '', symbols: [] },
  snapshot: null,
  perTradeUsd: 25,
  funded: false,
  starterSkr: false,
  lastLookAt: null,
  passes: {},
  lastBrief: null,
  aiModel: 'anthropic/claude-haiku-4.5',
});

export const useClockin = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...fresh(),
      connect: (w) => {
        // A different wallet is a different person's devnet book: start it clean.
        if (get().wallet?.address !== w.address) set({ ...fresh(), aiModel: get().aiModel, wallet: w });
        else set({ wallet: w });
      },
      updateMwa: (auth) => {
        const w = get().wallet;
        if (w?.kind === 'mwa') set({ wallet: { ...w, mwa: auth } });
      },
      disconnect: () => set({ ...fresh(), aiModel: get().aiModel }),
      log: (a) =>
        set({
          activity: [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: a.at ?? Date.now(), ...a }, ...get().activity].slice(0, 200),
        }),
      setStreak: (streak) => set({ streak }),
      recordBuy: (symbol, qtyRaw, cost) => {
        const prev = get().ledger[symbol];
        const today = dayKey();
        const bought = get().bought.day === today ? get().bought.symbols : [];
        set({
          ledger: {
            ...get().ledger,
            [symbol]: { qtyRaw: (BigInt(prev?.qtyRaw ?? '0') + qtyRaw).toString(), cost: (prev?.cost ?? 0) + cost },
          },
          bought: { day: today, symbols: bought.includes(symbol) ? bought : [...bought, symbol] },
        });
      },
      recordSell: (symbol) => {
        const { [symbol]: _gone, ...rest } = get().ledger;
        set({ ledger: rest });
      },
      setSnapshot: (prices) => set({ snapshot: { at: Date.now(), prices } }),
      set: (p) => set(p),
    }),
    {
      name: 'xorr-clockin-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function boughtToday(): string[] {
  const b = useClockin.getState().bought;
  return b.day === dayKey() ? b.symbols : [];
}

export function useClockinHydrated(): boolean {
  const [h, setH] = useState(useClockin.persist.hasHydrated());
  useEffect(() => useClockin.persist.onFinishHydration(() => setH(true)), []);
  return h;
}
