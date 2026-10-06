/** Web/test: Privy is not offered as a CLOCK IN signer off-device; the guest wallet covers the web preview. */
import type { Transaction } from '@solana/web3.js';

export const PRIVY_IN_CLOCKIN = false;

export function usePrivySolana(): { address?: string; ready: boolean; signedIn: boolean; sign: (tx: Transaction) => Promise<Transaction>; logout: () => Promise<void> } {
  return {
    ready: false,
    signedIn: false,
    sign: async () => {
      throw new Error('Privy signing is available in the phone app.');
    },
    logout: async () => undefined,
  };
}
