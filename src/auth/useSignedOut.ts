/**
 * Privy has answered, and nobody is signed in.
 *
 * False while a session is still being restored: a signed-in user must never see a sign-in prompt flash past on the way
 * to their own balance. Screens read this where a signed-out visit would otherwise pass for a fact about a wallet — a
 * "$0.00 supplied", an empty inbox, a "Not granted".
 */
import { useAuth } from './useAuth';
import { CLOCKIN } from '@/clockin/config';
import { useClockin } from '@/clockin/session';

export function useSignedOut(): boolean {
  const { ready, authenticated } = useAuth();
  // In the CLOCK IN build "signed in" means a connected wallet (Seed Vault, Privy or the devnet guest).
  const clockinWallet = useClockin((s) => s.wallet);
  if (CLOCKIN) return !clockinWallet;
  return ready && !authenticated;
}
