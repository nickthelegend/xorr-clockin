/**
 * Mobile Wallet Adapter — the Seeker-first wallet path (Android).
 *
 * `transact` opens whichever MWA wallet the phone has — on a Seeker that is the Seed Vault wallet; elsewhere Phantom,
 * Solflare or Backpack — authorizes this app for `solana:devnet`, and signs. The auth token is kept so later signatures
 * reauthorize silently instead of asking the owner to connect again.
 *
 * Sign-only (`signTransactions`), not sign-and-send: the CLOCK IN devnet faucet co-signs as fee payer after the owner,
 * so the owner never needs devnet SOL. The app broadcasts the fully signed transaction itself.
 */
import { PublicKey, type Transaction } from '@solana/web3.js';
import { transact, type Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { APP_IDENTITY } from './config';

export const MWA_AVAILABLE = true;

export type MwaAuth = { address: string; authToken: string; walletName?: string };

function toBase58(b64: string): string {
  return new PublicKey(Buffer.from(b64, 'base64')).toBase58();
}

async function authorize(wallet: Web3MobileWallet, previous?: MwaAuth): Promise<MwaAuth> {
  const res = await wallet.authorize({
    chain: 'solana:devnet',
    identity: APP_IDENTITY,
    ...(previous?.authToken ? { auth_token: previous.authToken } : {}),
  });
  const account = res.accounts[0];
  if (!account) throw new Error('The wallet authorized no account.');
  return {
    address: toBase58(account.address),
    authToken: res.auth_token,
    walletName: account.label ?? previous?.walletName,
  };
}

/** What a person should read when the wallet handshake fails, instead of the protocol's error code. */
export function mwaErrorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const msg = e instanceof Error ? e.message : String(e);
  if (code === 'ERROR_WALLET_NOT_FOUND' || /wallet.?not.?found|no installed wallet/i.test(msg)) {
    return 'No Mobile Wallet Adapter wallet on this phone. On a Seeker, Seed Vault answers here; elsewhere install Phantom, Solflare or Backpack — or try xorr with the devnet guest wallet below.';
  }
  if (/declin|reject|cancel/i.test(code + msg)) return 'The wallet declined. Nothing was signed.';
  return msg;
}

async function friendly<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    throw new Error(mwaErrorText(e), { cause: e });
  }
}

export async function mwaConnect(): Promise<MwaAuth> {
  return friendly(transact((wallet) => authorize(wallet)));
}

export async function mwaSign(auth: MwaAuth, txs: Transaction[]): Promise<{ signed: Transaction[]; auth: MwaAuth }> {
  return friendly(transact(async (wallet) => {
    const fresh = await authorize(wallet, auth);
    if (fresh.address !== auth.address) {
      throw new Error(`The wallet switched account (${fresh.address.slice(0, 4)}…). Reconnect from the Me tab.`);
    }
    const signed = await wallet.signTransactions({ transactions: txs });
    return { signed, auth: fresh };
  }));
}

export async function mwaDisconnect(auth: MwaAuth): Promise<void> {
  await transact((wallet) => wallet.deauthorize({ auth_token: auth.authToken })).catch(() => undefined);
}
