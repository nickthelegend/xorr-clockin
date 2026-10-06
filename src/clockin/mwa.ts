/**
 * Mobile Wallet Adapter is Android-only (Seeker's Seed Vault, Phantom, Solflare, Backpack…). On iOS and the web this
 * module says so instead of failing deep inside a native call; `mwa.android.ts` is the real one.
 */
import type { Transaction } from '@solana/web3.js';

export const MWA_AVAILABLE = false;

export type MwaAuth = { address: string; authToken: string; walletName?: string };

export async function mwaConnect(): Promise<MwaAuth> {
  throw new Error('Mobile Wallet Adapter needs Android — on a Seeker it opens Seed Vault. Use the devnet guest wallet here.');
}

export async function mwaSign(_auth: MwaAuth, _txs: Transaction[]): Promise<{ signed: Transaction[]; auth: MwaAuth }> {
  throw new Error('Mobile Wallet Adapter needs Android.');
}

export async function mwaDisconnect(_auth: MwaAuth): Promise<void> {}
