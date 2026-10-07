/**
 * Solana devnet for the CLOCK IN build: the connection, the keys this app holds, reads, and the transactions it sends.
 *
 * Three kinds of key, and the line between them is the product:
 *   - the OWNER's wallet (Seed Vault over MWA, Privy, or a devnet guest key) signs the permission, the stop, the daily
 *     clock-in and staking. This module never sees that key; it is handed a `sign` function.
 *   - the AGENT key is generated on this device and kept in the OS keystore. It is the SPL delegate: it can move only
 *     what the owner approved to it, and nothing at all after a revoke. The chain enforces both.
 *   - the devnet FAUCET key is the mint authority of the devnet stand-ins and pays network fees, so a judge needs no
 *     devnet SOL. It is a devnet-only key shipped in the APK on purpose; it can mint test tokens, nothing else.
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type Signer,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createApproveCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToCheckedInstruction,
  createRevokeInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  unpackAccount,
  type Account,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { DEVNET, devnetReady, DEVNET_RPC, MAINNET_READ_RPC, SKR_MAINNET_MINT, STOCKS, stockBySymbol } from './config';
import { getSecret, setSecret } from './secret';

export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const U64_MAX = 18_446_744_073_709_551_615n;

let _conn: Connection | null = null;
export function connection(): Connection {
  if (!_conn) _conn = new Connection(DEVNET_RPC, 'confirmed');
  return _conn;
}

/* ---------------------------------------------------------------------------------------------------------- keys */

let _faucet: Keypair | null | undefined;
let _deviceVenue: Keypair | null = null;

/** Use a key this phone holds as the mint authority and venue (the device's own stand-in set). */
export function setDeviceVenue(kp: Keypair | null): void {
  _deviceVenue = kp;
}

/** The devnet faucet/venue key: this phone's own when it runs its own set, else the build's. Null when neither. */
export function faucetKeypair(): Keypair | null {
  if (_deviceVenue) return _deviceVenue;
  if (_faucet !== undefined) return _faucet;
  const secret = process.env.EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET;
  try {
    _faucet = secret ? Keypair.fromSecretKey(bs58.decode(secret)) : null;
  } catch {
    _faucet = null;
  }
  return _faucet;
}

export function requireFaucet(): Keypair {
  const k = faucetKeypair();
  if (!k) throw new Error('This build has no devnet faucet key (EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET). See HANDOFF.md.');
  return k;
}

async function deviceKeypair(name: string): Promise<Keypair> {
  const stored = await getSecret(name);
  if (stored) return Keypair.fromSecretKey(bs58.decode(stored));
  const kp = Keypair.generate();
  await setSecret(name, bs58.encode(kp.secretKey));
  return kp;
}

export const AGENT_KEY = 'xorr.clockin.agent';
export const GUEST_KEY = 'xorr.clockin.guest';

/** The agent's own key — the SPL delegate. One per device, made on first use. */
export function agentKeypair(): Promise<Keypair> {
  return deviceKeypair(AGENT_KEY);
}

/** The devnet guest wallet — for iOS, emulators and anyone without an MWA wallet. Devnet only. */
export function guestKeypair(): Promise<Keypair> {
  return deviceKeypair(GUEST_KEY);
}

/* ------------------------------------------------------------------------------------------------------- reading */

export const ata = (owner: PublicKey, mint: string) => getAssociatedTokenAddressSync(new PublicKey(mint), owner, true);

export type TokenView = { address: string; raw: bigint; ui: number; delegate: string | null; delegatedRaw: bigint; exists: boolean };

export type ChainView = {
  sol: number;
  usdc: TokenView;
  skr: TokenView;
  stocks: Record<string, TokenView>;
  faucetSol: number | null;
  /** The agent key's own SOL — only used when the owner, not the faucet, pays devnet fees. */
  agentSol: number | null;
  at: number;
};

function view(address: PublicKey, info: Account | null, decimals: number): TokenView {
  if (!info) return { address: address.toBase58(), raw: 0n, ui: 0, delegate: null, delegatedRaw: 0n, exists: false };
  return {
    address: address.toBase58(),
    raw: info.amount,
    ui: Number(info.amount) / 10 ** decimals,
    delegate: info.delegate ? info.delegate.toBase58() : null,
    delegatedRaw: info.delegatedAmount,
    exists: true,
  };
}

/** Everything the screens show about an owner, in one `getMultipleAccounts`. */
export async function readOwner(owner: PublicKey, agent?: PublicKey): Promise<ChainView> {
  if (!devnetReady()) throw new Error('the devnet stand-in mints are not set up yet');
  const conn = connection();
  const usdcAta = ata(owner, DEVNET.usdcMint);
  const skrAta = ata(owner, DEVNET.skrMint);
  const stockAtas = STOCKS.map((s) => ata(owner, s.devnetMint));
  const faucet = faucetKeypair()?.publicKey;
  const keys = [owner, usdcAta, skrAta, ...stockAtas, ...(faucet ? [faucet] : []), ...(agent ? [agent] : [])];
  const faucetAt = faucet ? 3 + STOCKS.length : -1;
  const agentAt = agent ? 3 + STOCKS.length + (faucet ? 1 : 0) : -1;
  const infos = await conn.getMultipleAccountsInfo(keys, 'confirmed');
  const unpack = (i: number) => {
    const info = infos[i];
    if (!info || !info.owner.equals(TOKEN_PROGRAM_ID)) return null;
    try {
      return unpackAccount(keys[i]!, info, TOKEN_PROGRAM_ID);
    } catch {
      return null;
    }
  };
  const stocks: Record<string, TokenView> = {};
  STOCKS.forEach((s, j) => {
    stocks[s.symbol] = view(stockAtas[j]!, unpack(3 + j), s.decimals);
  });
  return {
    sol: (infos[0]?.lamports ?? 0) / LAMPORTS_PER_SOL,
    usdc: view(usdcAta, unpack(1), DEVNET.usdcDecimals),
    skr: view(skrAta, unpack(2), DEVNET.skrDecimals),
    stocks,
    faucetSol: faucet ? (infos[faucetAt]?.lamports ?? 0) / LAMPORTS_PER_SOL : null,
    agentSol: agent ? (infos[agentAt]?.lamports ?? 0) / LAMPORTS_PER_SOL : null,
    at: Date.now(),
  };
}

/** The owner's REAL SKR on mainnet — read-only, one RPC call, never a transaction. Null when it cannot be read. */
export async function readMainnetSkr(owner: PublicKey): Promise<number | null> {
  try {
    const conn = new Connection(MAINNET_READ_RPC, 'confirmed');
    const res = await conn.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(SKR_MAINNET_MINT) });
    return res.value.reduce((s, a) => s + Number(a.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0);
  } catch {
    return null;
  }
}

/** The permission as the chain sees it: who may spend the owner's dUSDC, and how much is left. */
export function permissionOf(v: ChainView, agent: PublicKey | null): { live: boolean; leftUsd: number; delegate: string | null } {
  const delegate = v.usdc.delegate;
  const live = !!agent && delegate === agent.toBase58() && v.usdc.delegatedRaw > 0n;
  return { live, leftUsd: live ? Number(v.usdc.delegatedRaw) / 10 ** DEVNET.usdcDecimals : 0, delegate };
}

/* ------------------------------------------------------------------------------------------------------- sending */

export type OwnerSign = (tx: Transaction) => Promise<Transaction>;

export function memo(text: string, signers: PublicKey[] = []): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: signers.map((pubkey) => ({ pubkey, isSigner: true, isWritable: false })),
    data: Buffer.from(text.slice(0, 400), 'utf8'),
  });
}

export class ChainRefused extends Error {
  constructor(
    message: string,
    readonly signature: string,
    readonly logs: string[] = [],
  ) {
    super(message);
  }
}

/**
 * Build, sign and send. The faucet pays the fee; the owner signs first (if this transaction needs them), then every
 * device-held signer. Resolves to the confirmed signature, or throws `ChainRefused` with the landed signature when
 * `expectFailure`-style sends are made with `skipPreflight`.
 */
export type FeePayer = { kind: 'faucet' } | { kind: 'owner'; pubkey: PublicKey } | { kind: 'signer'; signer: Signer };

export async function send(
  ixs: TransactionInstruction[],
  opts: { owner?: { sign: OwnerSign }; signers?: Signer[]; skipPreflight?: boolean; payer?: FeePayer } = {},
): Promise<string> {
  const conn = connection();
  const faucet = requireFaucet();
  const payer = opts.payer ?? { kind: 'faucet' };
  const feePayer = payer.kind === 'faucet' ? faucet.publicKey : payer.kind === 'owner' ? payer.pubkey : payer.signer.publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
  let tx = new Transaction({ feePayer, blockhash, lastValidBlockHeight }).add(...ixs);
  if (opts.owner) tx = await opts.owner.sign(tx);
  // Co-sign with every device-held key this transaction actually names as a signer (the faucet only as mint authority
  // when it is not paying).
  const needed = new Set(
    tx
      .compileMessage()
      .accountKeys.slice(0, tx.compileMessage().header.numRequiredSignatures)
      .map((k) => k.toBase58()),
  );
  const cosigners = [faucet, ...(opts.signers ?? []), ...(payer.kind === 'signer' ? [payer.signer] : [])].filter(
    (k, i, all) => needed.has(k.publicKey.toBase58()) && all.findIndex((x) => x.publicKey.equals(k.publicKey)) === i,
  );
  if (cosigners.length) tx.partialSign(...cosigners);
  const raw = tx.serialize({ requireAllSignatures: true, verifySignatures: true });
  const sig = await conn.sendRawTransaction(raw, { skipPreflight: !!opts.skipPreflight, preflightCommitment: 'confirmed' });
  const err = await confirmByPolling(conn, sig, lastValidBlockHeight);
  if (err) {
    const t = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }).catch(() => null);
    throw new ChainRefused(`The chain refused it: ${JSON.stringify(err)}`, sig, t?.meta?.logMessages ?? []);
  }
  return sig;
}

/**
 * Wait for `confirmed` by polling, not over a websocket: a phone on a flaky network, an RPC without a websocket and the
 * React Native runtime all make the subscription the fragile part. Resolves to the transaction's error, or null.
 */
async function confirmByPolling(conn: Connection, sig: string, lastValidBlockHeight: number): Promise<unknown> {
  for (let i = 0; i < 90; i++) {
    const { value } = await conn.getSignatureStatuses([sig]);
    const st = value[0];
    if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) return st.err ?? null;
    if (st?.err) return st.err;
    if (i % 5 === 4 && (await conn.getBlockHeight('confirmed')) > lastValidBlockHeight) {
      throw new Error('The transaction expired before it landed. Try again.');
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error('Devnet did not confirm the transaction in time. It may still land — check the trail.');
}

/* -------------------------------------------------------------------------------------------- the transactions */

const usdcRaw = (usd: number) => BigInt(Math.round(usd * 10 ** DEVNET.usdcDecimals));
const skrRaw = (skr: number) => BigInt(Math.round(skr * 10 ** DEVNET.skrDecimals));

/** Starter dUSDC and the owner's token accounts, paid and minted by the faucet. No owner signature. */
export function fundStarterIxs(owner: PublicKey, usd: number, payer?: PublicKey): TransactionInstruction[] {
  const f = requireFaucet().publicKey;
  const p = payer ?? f;
  return [
    createAssociatedTokenAccountIdempotentInstruction(p, ata(owner, DEVNET.usdcMint), owner, new PublicKey(DEVNET.usdcMint)),
    createAssociatedTokenAccountIdempotentInstruction(p, ata(owner, DEVNET.skrMint), owner, new PublicKey(DEVNET.skrMint)),
    createMintToCheckedInstruction(new PublicKey(DEVNET.usdcMint), ata(owner, DEVNET.usdcMint), f, usdcRaw(usd), DEVNET.usdcDecimals),
    memo(`xorr clockin: starter ${usd} dUSDC (devnet test money)`),
  ];
}

export function mintSkrIxs(owner: PublicKey, skr: number, note: string, payer?: PublicKey): TransactionInstruction[] {
  const f = requireFaucet().publicKey;
  const p = payer ?? f;
  return [
    createAssociatedTokenAccountIdempotentInstruction(p, ata(owner, DEVNET.skrMint), owner, new PublicKey(DEVNET.skrMint)),
    createMintToCheckedInstruction(new PublicKey(DEVNET.skrMint), ata(owner, DEVNET.skrMint), f, skrRaw(skr), DEVNET.skrDecimals),
    memo(note),
  ];
}

/** The daily clock-in: a memo the OWNER signs (the proof they showed up) plus the dSKR reward. */
export function checkInIxs(owner: PublicKey, day: string, streak: number, reward: number, payer?: PublicKey): TransactionInstruction[] {
  return [
    memo(`xorr clock-in ${day} · streak ${streak} · +${reward} dSKR`, [owner]),
    ...mintSkrIxs(owner, reward, `xorr clockin reward ${reward} dSKR (devnet stand-in for SKR)`, payer).slice(0, 2),
  ];
}

/**
 * The permission: `ApproveChecked` of `capUsd` dUSDC to the agent, and of every stock account so the agent's exits can
 * sell unattended. One transaction, one owner signature.
 */
export function grantIxs(owner: PublicKey, agent: PublicKey, capUsd: number, payer?: PublicKey, agentGasLamports = 0): TransactionInstruction[] {
  const p = payer ?? requireFaucet().publicKey;
  const ixs: TransactionInstruction[] = [];
  for (const s of STOCKS) {
    ixs.push(createAssociatedTokenAccountIdempotentInstruction(p, ata(owner, s.devnetMint), owner, new PublicKey(s.devnetMint)));
  }
  ixs.push(createApproveCheckedInstruction(ata(owner, DEVNET.usdcMint), new PublicKey(DEVNET.usdcMint), agent, owner, usdcRaw(capUsd), DEVNET.usdcDecimals));
  for (const s of STOCKS) {
    ixs.push(createApproveCheckedInstruction(ata(owner, s.devnetMint), new PublicKey(s.devnetMint), agent, owner, U64_MAX, s.decimals));
  }
  // When the owner pays devnet fees (the faucet is empty), the agent gets a little SOL of its own to pay for its trades.
  if (agentGasLamports > 0) ixs.push(SystemProgram.transfer({ fromPubkey: owner, toPubkey: agent, lamports: agentGasLamports }));
  ixs.push(memo(`xorr grant: agent ${agent.toBase58()} may spend ${capUsd} dUSDC and sell stand-in xStocks; revoke any time`));
  return ixs;
}

/** The stop: `Revoke` on every account that names the agent. */
export function revokeIxs(owner: PublicKey, v: ChainView): TransactionInstruction[] {
  const ixs: TransactionInstruction[] = [];
  if (v.usdc.exists) ixs.push(createRevokeInstruction(new PublicKey(v.usdc.address), owner));
  for (const s of STOCKS) {
    const t = v.stocks[s.symbol];
    if (t?.exists && t.delegate) ixs.push(createRevokeInstruction(new PublicKey(t.address), owner));
  }
  ixs.push(memo('xorr revoke: the agent can no longer move anything'));
  return ixs;
}

function feeAdjusted(raw: bigint, feeBps: number): bigint {
  return (raw * BigInt(10_000 - feeBps)) / 10_000n;
}

/**
 * An agent buy on devnet: the AGENT, as delegate, moves dUSDC from the owner to the devnet venue; the venue delivers
 * the stand-in xStock at the live price, less the tier's fee. If the permission does not cover it the token program
 * refuses the whole transaction — nothing is delivered.
 */
export function agentBuyIxs(owner: PublicKey, agent: PublicKey, symbol: string, usd: number, price: number, feeBps: number, note: string, payer?: PublicKey) {
  const s = stockBySymbol(symbol)!;
  const f = requireFaucet().publicKey;
  const p = payer ?? f;
  const qtyRaw = feeAdjusted(BigInt(Math.floor((usd / price) * 10 ** s.decimals)), feeBps);
  return {
    qtyRaw,
    ixs: [
      createAssociatedTokenAccountIdempotentInstruction(p, ata(owner, s.devnetMint), owner, new PublicKey(s.devnetMint)),
      createAssociatedTokenAccountIdempotentInstruction(p, ata(f, DEVNET.usdcMint), f, new PublicKey(DEVNET.usdcMint)),
      createTransferCheckedInstruction(ata(owner, DEVNET.usdcMint), new PublicKey(DEVNET.usdcMint), ata(f, DEVNET.usdcMint), agent, usdcRaw(usd), DEVNET.usdcDecimals),
      createMintToCheckedInstruction(new PublicKey(s.devnetMint), ata(owner, s.devnetMint), f, qtyRaw, s.decimals),
      memo(note),
    ],
  };
}

/** An agent exit: the agent, as delegate on the stock account, sells to the venue; dUSDC comes back to the owner. */
export function agentSellIxs(owner: PublicKey, agent: PublicKey, symbol: string, qtyRaw: bigint, price: number, feeBps: number, note: string, payer?: PublicKey) {
  const s = stockBySymbol(symbol)!;
  const f = requireFaucet().publicKey;
  const p = payer ?? f;
  const usd = (Number(qtyRaw) / 10 ** s.decimals) * price;
  const outRaw = feeAdjusted(usdcRaw(usd), feeBps);
  return {
    outRaw,
    ixs: [
      createAssociatedTokenAccountIdempotentInstruction(p, ata(f, s.devnetMint), f, new PublicKey(s.devnetMint)),
      createTransferCheckedInstruction(ata(owner, s.devnetMint), new PublicKey(s.devnetMint), ata(f, s.devnetMint), agent, qtyRaw, s.decimals),
      createMintToCheckedInstruction(new PublicKey(DEVNET.usdcMint), ata(owner, DEVNET.usdcMint), f, outRaw, DEVNET.usdcDecimals),
      memo(note),
    ],
  };
}

/** The proof that the cap is the chain's: the agent tries to move more than it was approved. */
export function overCapIxs(owner: PublicKey, agent: PublicKey, usd: number): TransactionInstruction[] {
  const f = requireFaucet().publicKey;
  return [
    createTransferCheckedInstruction(ata(owner, DEVNET.usdcMint), new PublicKey(DEVNET.usdcMint), ata(f, DEVNET.usdcMint), agent, usdcRaw(usd), DEVNET.usdcDecimals),
    memo(`xorr cap test: agent tries ${usd} dUSDC, over its permission`),
  ];
}

/** Pay a strategy's 24-hour shift in SKR: the OWNER signs a `TransferChecked` of dSKR to the xorr treasury. */
export function payShiftIxs(owner: PublicKey, skr: number, strategy: string, payer?: PublicKey): TransactionInstruction[] {
  const f = requireFaucet().publicKey;
  const p = payer ?? f;
  const treasury = ata(f, DEVNET.skrMint);
  return [
    createAssociatedTokenAccountIdempotentInstruction(p, treasury, f, new PublicKey(DEVNET.skrMint)),
    createTransferCheckedInstruction(ata(owner, DEVNET.skrMint), new PublicKey(DEVNET.skrMint), treasury, owner, skrRaw(skr), DEVNET.skrDecimals),
    memo(`xorr shift: ${strategy} for 24h, paid ${skr} dSKR (devnet stand-in for SKR)`, [owner]),
  ];
}

const TOKEN_2022 = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const SGT_GROUP = 'GT22s89nU4iWFkNXj1Bw6uYhJJWDRPpShHt4Bk8f99Te';

/**
 * The owner's Seeker Genesis Token on mainnet, if they hold one — read-only. A non-zero Token-2022 account whose mint
 * points its metadata AND its token-group membership at the SGT group (Solana Mobile, "detecting Seeker users").
 * Returns the SGT mint, or null (no SGT, or the read failed). Client-side: it gates a reward multiplier on devnet
 * stand-in tokens, nothing of value.
 */
export async function readSeekerGenesis(owner: PublicKey): Promise<string | null> {
  try {
    const conn = new Connection(MAINNET_READ_RPC, 'confirmed');
    const { value } = await conn.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022 });
    const mints = value
      .map((a) => a.account.data.parsed?.info)
      .filter((i) => i?.tokenAmount?.amount !== '0' && i?.tokenAmount?.decimals === 0)
      .map((i) => new PublicKey(i.mint));
    for (let k = 0; k < mints.length; k += 100) {
      const infos = await conn.getMultipleParsedAccounts(mints.slice(k, k + 100));
      for (let j = 0; j < infos.value.length; j++) {
        const data = infos.value[j]?.data as { parsed?: { info?: { extensions?: { extension: string; state?: Record<string, string> }[] } } } | undefined;
        const ext = data?.parsed?.info?.extensions ?? [];
        const mp = ext.find((e) => e.extension === 'metadataPointer')?.state?.metadataAddress;
        const gm = ext.find((e) => e.extension === 'tokenGroupMember')?.state?.group;
        if (mp === SGT_GROUP && gm === SGT_GROUP) return mints[k + j]!.toBase58();
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function airdropSol(owner: PublicKey, sol = 0.5): Promise<string> {
  const conn = connection();
  const sig = await conn.requestAirdrop(owner, Math.round(sol * LAMPORTS_PER_SOL));
  const { lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
  await confirmByPolling(conn, sig, lastValidBlockHeight);
  return sig;
}
