/**
 * Disconnect, done properly: everything this phone keeps for the session goes, not only the session record.
 *
 * - the keystore: the guest wallet key, the agent key (the SPL delegate), this phone's venue key and the OpenRouter key;
 * - this phone's own stand-in mint set, whose authority was the venue key;
 * - the wallet sessions: the Mobile Wallet Adapter authorization is deauthorized, and Privy is signed out.
 *
 * A permission granted on chain stays on chain, but its delegate's key is gone, so nothing can spend under it. The
 * wallet steps are best-effort (a wallet app that is gone, or a Privy session already ended, must not block the rest);
 * the keystore deletions are not.
 */
import { AI_KEY } from './ai';
import { forgetDeviceSet, VENUE_KEY } from './bootstrap';
import { AGENT_KEY, GUEST_KEY } from './chain';
import { deleteSecret } from './secret';

export const DEVICE_SECRETS = [GUEST_KEY, AGENT_KEY, VENUE_KEY, AI_KEY] as const;

export type ForgetDeps = {
  /** Deauthorizes the Mobile Wallet Adapter session, when the wallet is an MWA wallet. */
  deauthorizeWallet?: () => Promise<unknown>;
  /** Privy's logout, when a Privy session may exist. */
  privyLogout?: () => Promise<unknown>;
};

export async function forgetDevice(deps: ForgetDeps = {}): Promise<{ walletSignedOut: boolean }> {
  let walletSignedOut = true;
  if (deps.deauthorizeWallet) await deps.deauthorizeWallet().catch(() => (walletSignedOut = false));
  if (deps.privyLogout) await deps.privyLogout().catch(() => (walletSignedOut = false));
  for (const key of DEVICE_SECRETS) await deleteSecret(key);
  await forgetDeviceSet();
  return { walletSignedOut };
}
