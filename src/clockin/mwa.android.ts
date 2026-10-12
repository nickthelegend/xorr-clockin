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

import { buildSignInInput, createSignInMessageText, fromB64, proofOf, utf8, verifySignIn, type SiwsProof } from './siws';

export type MwaAuth = { address: string; authToken: string; walletName?: string; siws?: SiwsProof | null };

function toBase58(b64: string): string {
  return new PublicKey(Buffer.from(b64, 'base64')).toBase58();
}

async function authorize(wallet: Web3MobileWallet, previous?: MwaAuth): Promise<MwaAuth> {
  const ask = (authToken?: string) =>
    wallet.authorize({ chain: 'solana:devnet', identity: APP_IDENTITY, ...(authToken ? { auth_token: authToken } : {}) });
  let res: Awaited<ReturnType<typeof ask>>;
  try {
    // Reauthorize silently with the cached token…
    res = await ask(previous?.authToken);
  } catch (e) {
    // …and if the wallet no longer honours it (revoked, expired, wallet reinstalled), ask afresh — unless the person
    // declined, which is an answer, not a stale token.
    if (!previous?.authToken || /declin|reject|cancel/i.test(String((e as { code?: string })?.code ?? '') + String(e))) throw e;
    res = await ask();
  }
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

/**
 * Connect = authorize + Sign In With Solana in one wallet sheet (`sign_in_payload`). Seed Vault, Phantom and Solflare
 * return `sign_in_result`, verified here (ed25519 + our domain, nonce, chain and a fresh time). A wallet that ignores
 * the payload is asked to sign the same text with `signMessages`; if it declines, the owner is connected without a proof.
 */
export async function mwaConnect(): Promise<MwaAuth> {
  const input = buildSignInInput();
  return friendly(
    transact(async (wallet) => {
      const res = await wallet.authorize({ chain: 'solana:devnet', identity: APP_IDENTITY, sign_in_payload: input } as Parameters<typeof wallet.authorize>[0]);
      const account = res.accounts[0];
      if (!account) throw new Error('The wallet authorized no account.');
      const address = toBase58(account.address);
      const signer = account.label ?? 'your wallet';
      const base = { address, authToken: res.auth_token, walletName: account.label };
      const sir = (res as { sign_in_result?: { address: string; signed_message: string; signature: string } }).sign_in_result;
      if (sir) {
        const signature = fromB64(sir.signature);
        const v = verifySignIn(input, { address: toBase58(sir.address), signedMessage: fromB64(sir.signed_message), signature });
        if (!v.ok) throw new Error(`The wallet's sign-in did not verify (${v.reason}).`);
        return { ...base, siws: proofOf('siws', signer, input, v, signature) };
      }
      try {
        const msg = utf8(createSignInMessageText({ ...input, address }));
        const [signed] = await wallet.signMessages({ addresses: [account.address], payloads: [msg] });
        if (!signed) throw new Error('No signature returned.');
        for (const signature of [signed.slice(-64), signed.slice(0, 64)]) {
          const v = verifySignIn(input, { address, signedMessage: msg, signature });
          if (v.ok) return { ...base, siws: proofOf('signMessage', signer, input, v, signature) };
        }
      } catch {
        /* declined: connected without a sign-in proof */
      }
      return { ...base, siws: null };
    }),
  );
}

export async function mwaSign(auth: MwaAuth, txs: Transaction[]): Promise<{ signed: Transaction[]; auth: MwaAuth }> {
  return friendly(transact(async (wallet) => {
    const fresh = await authorize(wallet, auth);
    if (fresh.address !== auth.address) {
      throw new Error(`The wallet switched account (${fresh.address.slice(0, 4)}…). Disconnect it in Profile and connect again.`);
    }
    const signed = await wallet.signTransactions({ transactions: txs });
    return { signed, auth: fresh };
  }));
}

export async function mwaDisconnect(auth: MwaAuth): Promise<void> {
  await transact((wallet) => wallet.deauthorize({ auth_token: auth.authToken })).catch(() => undefined);
}
