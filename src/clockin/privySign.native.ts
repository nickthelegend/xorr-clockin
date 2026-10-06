/**
 * Privy's embedded Solana wallet as a CLOCK IN signer (iOS/Android). Sign-only: the app adds the devnet faucet's
 * fee-payer signature after the owner's and broadcasts to devnet itself.
 */
import { useCallback } from 'react';
import type { Transaction } from '@solana/web3.js';
import { useEmbeddedSolanaWallet, usePrivy } from '@privy-io/expo';

export const PRIVY_IN_CLOCKIN = true;

export function usePrivySolana(): { address?: string; ready: boolean; signedIn: boolean; sign: (tx: Transaction) => Promise<Transaction>; logout: () => Promise<void> } {
  const { user, logout } = usePrivy();
  const solana = useEmbeddedSolanaWallet();
  const wallet = solana.wallets?.[0];
  const sign = useCallback(
    async (tx: Transaction) => {
      if (!wallet) throw new Error('Your Privy wallet is not ready yet.');
      const provider = await wallet.getProvider();
      const { signedTransaction } = await provider.request({ method: 'signTransaction', params: { transaction: tx } });
      return signedTransaction as Transaction;
    },
    [wallet],
  );
  return { address: wallet?.address, ready: solana.status === 'connected' && !!wallet, signedIn: !!user, sign, logout };
}
