/**
 * The connected owner and a `sign` that works whichever wallet it is: Seed Vault / any MWA wallet (Android), Privy's
 * embedded wallet, or the devnet guest key. Every owner-signed transaction in the CLOCK IN build goes through here.
 */
import { useCallback, useMemo, useRef } from 'react';
import { PublicKey, type Transaction } from '@solana/web3.js';
import { guestKeypair, type OwnerSign } from './chain';
import { mwaSign } from './mwa';
import { usePrivySolana } from './privySign';
import { useClockin, type WalletKind } from './session';

export type Owner = {
  kind: WalletKind;
  address: string;
  pubkey: PublicKey;
  label: string;
  sign: OwnerSign;
};

export const WALLET_LABEL: Record<WalletKind, string> = {
  mwa: 'Seed Vault / MWA wallet',
  privy: 'Privy wallet',
  guest: 'Devnet guest wallet',
};

export function useOwner(): Owner | null {
  const wallet = useClockin((s) => s.wallet);
  const updateMwa = useClockin((s) => s.updateMwa);
  const privy = usePrivySolana();
  // Through a ref, so `sign` (and the owner object every screen keys its effects on) stays the same across renders.
  const privyRef = useRef(privy);
  privyRef.current = privy;

  const sign = useCallback<OwnerSign>(
    async (tx: Transaction) => {
      const w = useClockin.getState().wallet;
      if (!w) throw new Error('No wallet is connected.');
      if (w.kind === 'guest') {
        const kp = await guestKeypair();
        tx.partialSign(kp);
        return tx;
      }
      if (w.kind === 'mwa') {
        if (!w.mwa) throw new Error('Reconnect your wallet from the Me tab.');
        const { signed, auth } = await mwaSign(w.mwa, [tx]);
        updateMwa(auth);
        return signed[0]!;
      }
      return privyRef.current.sign(tx);
    },
    [updateMwa],
  );

  return useMemo(() => {
    if (!wallet) return null;
    return {
      kind: wallet.kind,
      address: wallet.address,
      pubkey: new PublicKey(wallet.address),
      label: wallet.label ?? WALLET_LABEL[wallet.kind],
      sign,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address, wallet?.kind, wallet?.label, sign]);
}
