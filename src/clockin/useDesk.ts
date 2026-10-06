/** Everything a CLOCK IN screen draws, kept fresh: read on focus and every 30 seconds while the screen is open. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { PublicKey } from '@solana/web3.js';
import { plan, refresh, standing, useLive } from './desk';
import { useClockin } from './session';
import { useOwner } from './useOwner';

export function useDesk() {
  const owner = useOwner();
  const live = useLive();
  const passes = useClockin((s) => s.passes);
  const streak = useClockin((s) => s.streak);
  const perTrade = useClockin((s) => s.perTradeUsd);
  const ledger = useClockin((s) => s.ledger);
  const first = useRef(true);

  const address = owner?.address;
  const reload = useCallback(async () => {
    if (!address) return;
    const mainnet = first.current;
    first.current = false;
    await refresh(new PublicKey(address), { mainnet });
  }, [address]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      const t = setInterval(() => void reload(), 30_000);
      return () => clearInterval(t);
    }, [reload]),
  );
  useEffect(() => {
    first.current = true;
  }, [address]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const st = useMemo(() => standing(live, passes), [live, passes, ledger]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const p = useMemo(() => plan(live), [live, passes, streak, perTrade, ledger]);
  // Pull-to-refresh shows its own spinner; the 30-second background reads never do.
  const [pulling, setPulling] = useState(false);
  const onPull = useCallback(async () => {
    setPulling(true);
    try {
      await reload();
    } finally {
      setPulling(false);
    }
  }, [reload]);
  return { owner, live, st, plan: p, reload, pulling, onPull };
}
