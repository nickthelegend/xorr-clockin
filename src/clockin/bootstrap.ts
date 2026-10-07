/**
 * Make sure there are stand-in mints to trade, whatever happened to xorr's shared devnet faucet.
 *
 * Normally the shared set in `devnet.json` exists on devnet and xorr's faucet is its mint authority. If that set is not
 * on the cluster (it was never created — devnet SOL is rate-limited — or devnet was reset), this phone creates its own
 * set: a venue key kept in the keystore becomes the mint authority, and the owner pays the ~0.011 SOL of rent from devnet
 * SOL airdropped to them. Every screen then works the same way, on this phone's own mints, and says so in Profile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMint2Instruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { DEVNET, SHARED_SET, STOCKS, applyMintSet, type MintSet } from './config';
import { airdropSol, connection, send, setDeviceVenue } from './chain';
import { getSecret, setSecret } from './secret';
import type { Owner } from './useOwner';

const SET_KEY = 'xorr.clockin.mintset.v1';
const VENUE_KEY = 'xorr.clockin.venue';

let checked: 'shared' | 'device' | null = null;

async function exists(addr: string): Promise<boolean> {
  if (!addr) return false;
  try {
    return !!(await connection().getAccountInfo(new PublicKey(addr), 'confirmed'));
  } catch {
    return false;
  }
}

/** Use the stored device set, if there is one and it is on chain. */
async function loadDeviceSet(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SET_KEY);
  const secret = await getSecret(VENUE_KEY);
  if (!raw || !secret) return false;
  const set = JSON.parse(raw) as MintSet;
  if (!(await exists(set.usdc))) return false;
  setDeviceVenue(Keypair.fromSecretKey(bs58.decode(secret)));
  applyMintSet(set, 'device');
  return true;
}

/**
 * Resolve which mints this session uses, before anything is read. Cheap after the first call. Returns 'missing' when
 * neither set is usable yet; `createDeviceSet` fixes that.
 */
export async function resolveMints(): Promise<'shared' | 'device' | 'missing'> {
  if (checked) return checked;
  if (SHARED_SET.usdc && (await exists(SHARED_SET.usdc))) {
    applyMintSet(SHARED_SET, 'shared');
    return (checked = 'shared');
  }
  if (await loadDeviceSet()) return (checked = 'device');
  return 'missing';
}

/** Create this phone's own stand-in set. The owner signs and pays rent; airdrops devnet SOL first if needed. */
export async function createDeviceSet(owner: Owner): Promise<MintSet> {
  const conn = connection();
  if ((await conn.getBalance(owner.pubkey)) < 0.02 * LAMPORTS_PER_SOL) {
    await airdropSol(owner.pubkey, 1).catch(async (e) => {
      // A smaller ask sometimes gets through when the full one is refused.
      if ((await conn.getBalance(owner.pubkey)) < 0.012 * LAMPORTS_PER_SOL) await airdropSol(owner.pubkey, 0.05).catch(() => Promise.reject(e));
    });
  }

  const stored = await getSecret(VENUE_KEY);
  const venue = stored ? Keypair.fromSecretKey(bs58.decode(stored)) : Keypair.generate();
  if (!stored) await setSecret(VENUE_KEY, bs58.encode(venue.secretKey));
  setDeviceVenue(venue);

  const rent = await conn.getMinimumBalanceForRentExemption(MINT_SIZE);
  const plan = [
    { key: 'usdc', decimals: 6 },
    { key: 'skr', decimals: 6 },
    ...STOCKS.map((s) => ({ key: s.symbol, decimals: s.decimals })),
  ].map((m) => ({ ...m, kp: Keypair.generate() }));

  // Four mints a transaction keeps each well under the size limit.
  for (let i = 0; i < plan.length; i += 4) {
    const batch = plan.slice(i, i + 4);
    const ixs = batch.flatMap((m) => [
      SystemProgram.createAccount({ fromPubkey: owner.pubkey, newAccountPubkey: m.kp.publicKey, lamports: rent, space: MINT_SIZE, programId: TOKEN_PROGRAM_ID }),
      createInitializeMint2Instruction(m.kp.publicKey, m.decimals, venue.publicKey, null),
    ]);
    await send(ixs, { owner, signers: batch.map((m) => m.kp), payer: { kind: 'owner', pubkey: owner.pubkey } });
  }

  const addr = (k: string) => plan.find((m) => m.key === k)!.kp.publicKey.toBase58();
  const set: MintSet = {
    faucet: venue.publicKey.toBase58(),
    usdc: addr('usdc'),
    skr: addr('skr'),
    stocks: Object.fromEntries(STOCKS.map((s) => [s.symbol, addr(s.symbol)])),
  };
  await AsyncStorage.setItem(SET_KEY, JSON.stringify(set));
  applyMintSet(set, 'device');
  checked = 'device';
  return set;
}

export function mintSource(): 'shared' | 'device' {
  return DEVNET.source;
}
