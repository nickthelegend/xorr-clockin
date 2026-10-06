/**
 * Create the CLOCK IN devnet stand-in mints and write their addresses to `src/clockin/devnet.json`.
 *
 *   CLOCKIN_FAUCET_KEYPAIR=~/.config/solana/xorr-clockin/faucet.json npx tsx tools/clockin/setup-devnet.ts
 *
 * Env:
 *   CLOCKIN_RPC              default https://api.devnet.solana.com (a local `solana-test-validator` works too)
 *   CLOCKIN_FAUCET_KEYPAIR   the faucet/venue keypair JSON (mint authority + fee payer). Never committed.
 *   CLOCKIN_OUT              where to write the addresses (default src/clockin/devnet.json)
 *   CLOCKIN_ENV_OUT          where to write EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET (default .env.local, gitignored)
 *
 * Idempotent: a mint already listed in the output file and present on the cluster is kept.
 * Refuses to run against anything that looks like mainnet.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bs58 from 'bs58';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

const root = path.resolve(import.meta.dirname, '../..');
const rpc = process.env.CLOCKIN_RPC ?? 'https://api.devnet.solana.com';
if (/mainnet/i.test(rpc)) throw new Error(`Refusing to run against ${rpc}: CLOCK IN is devnet only.`);
const keyPath = (process.env.CLOCKIN_FAUCET_KEYPAIR ?? '~/.config/solana/xorr-clockin/faucet.json').replace(/^~/, os.homedir());
const out = path.resolve(root, process.env.CLOCKIN_OUT ?? 'src/clockin/devnet.json');
const envOut = path.resolve(root, process.env.CLOCKIN_ENV_OUT ?? '.env.local');

const faucet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, 'utf8'))));
const conn = new Connection(rpc, 'confirmed');

type Out = { faucet: string; usdc: string; skr: string; stocks: Record<string, string>; createdAt: string; cluster?: string };
const prev: Out = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { faucet: '', usdc: '', skr: '', stocks: {}, createdAt: '' };
const STOCKS = ['NVDAx', 'TSLAx', 'AAPLx', 'MSFTx', 'SPYx'];

async function exists(addr: string | undefined): Promise<boolean> {
  if (!addr) return false;
  return !!(await conn.getAccountInfo(new PublicKey(addr)));
}

async function mint(label: string, decimals: number, have?: string): Promise<string> {
  if (prev.faucet === faucet.publicKey.toBase58() && (await exists(have))) {
    console.log(`  ${label.padEnd(8)} ${have} (kept)`);
    return have!;
  }
  const m = await createMint(conn, faucet, faucet.publicKey, null, decimals);
  console.log(`  ${label.padEnd(8)} ${m.toBase58()} (created, ${decimals} decimals)`);
  return m.toBase58();
}

async function main() {
  console.log(`cluster  ${rpc}`);
  console.log(`faucet   ${faucet.publicKey.toBase58()}`);
  let bal = await conn.getBalance(faucet.publicKey);
  if (bal < 0.05 * LAMPORTS_PER_SOL && /127\.0\.0\.1|localhost/.test(rpc)) {
    await conn.confirmTransaction(await conn.requestAirdrop(faucet.publicKey, 100 * LAMPORTS_PER_SOL), 'confirmed');
    bal = await conn.getBalance(faucet.publicKey);
  }
  console.log(`balance  ${bal / LAMPORTS_PER_SOL} SOL`);
  if (bal < 0.03 * LAMPORTS_PER_SOL) throw new Error('The faucet needs at least 0.03 SOL to create the mints. Fund it first.');

  const usdc = await mint('dUSDC', 6, prev.usdc);
  const skr = await mint('dSKR', 6, prev.skr);
  const stocks: Record<string, string> = {};
  for (const s of STOCKS) stocks[s] = await mint(s, 8, prev.stocks?.[s]);

  // The venue's own accounts: dUSDC it receives on a buy, and each stock it receives on a sale.
  for (const m of [usdc, ...Object.values(stocks)]) await getOrCreateAssociatedTokenAccount(conn, faucet, new PublicKey(m), faucet.publicKey);

  const file: Out = { faucet: faucet.publicKey.toBase58(), usdc, skr, stocks, createdAt: new Date().toISOString(), cluster: rpc };
  fs.writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
  console.log(`wrote    ${path.relative(root, out)}`);

  const line = `EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET=${bs58.encode(faucet.secretKey)}`;
  const env = fs.existsSync(envOut) ? fs.readFileSync(envOut, 'utf8').split('\n').filter((l) => l && !l.startsWith('EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET=')) : [];
  fs.writeFileSync(envOut, [...env, line].join('\n') + '\n', { mode: 0o600 });
  console.log(`wrote    ${path.relative(root, envOut)} (faucet secret — gitignored, never commit)`);
  console.log(`balance  ${(await conn.getBalance(faucet.publicKey)) / LAMPORTS_PER_SOL} SOL left`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
