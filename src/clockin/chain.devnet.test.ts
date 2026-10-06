/**
 * The CLOCK IN loop, end to end, on a real cluster — every transaction the app sends, in the order a person meets them.
 *
 *   CLOCKIN_LIVE=1 EXPO_PUBLIC_CLOCKIN_RPC=https://api.devnet.solana.com \
 *   EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET=… npx vitest run src/clockin/chain.devnet.test.ts
 *
 * (`.env.local` written by tools/clockin/setup-devnet.ts carries the faucet secret.) Prints each signature.
 */
import { describe, expect, it } from 'vitest';
import { Keypair, type Transaction } from '@solana/web3.js';
import { STARTER_USDC, STOCKS, DEVNET_RPC } from './config';
import {
  ChainRefused,
  agentBuyIxs,
  agentSellIxs,
  checkInIxs,
  fundStarterIxs,
  grantIxs,
  mintSkrIxs,
  overCapIxs,
  payShiftIxs,
  permissionOf,
  readOwner,
  revokeIxs,
  send,
} from './chain';

const run = process.env.CLOCKIN_LIVE && process.env.EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET ? describe : describe.skip;

run(`CLOCK IN on ${DEVNET_RPC}`, () => {
  const owner = Keypair.generate();
  const agent = Keypair.generate();
  const sign = { sign: async (tx: Transaction) => (tx.partialSign(owner), tx) };
  const sigs: Record<string, string> = {};
  const say = (k: string, s: string) => {
    sigs[k] = s;
    console.log(`${k.padEnd(22)} ${s}`);
  };

  it('funds a new wallet with no signature from it', async () => {
    say('fund', await send(fundStarterIxs(owner.publicKey, STARTER_USDC)));
    say('starter dSKR', await send(mintSkrIxs(owner.publicKey, 250, 'test starter dSKR')));
    const v = await readOwner(owner.publicKey);
    expect(v.usdc.ui).toBe(STARTER_USDC);
    expect(v.skr.ui).toBe(250);
    expect(v.sol).toBe(0); // the owner never needed SOL
  }, 90_000);

  it('clocks in: the owner signs the memo, the reward lands', async () => {
    say('check-in', await send(checkInIxs(owner.publicKey, '2026-10-06', 1, 10), { owner: sign }));
    expect((await readOwner(owner.publicKey)).skr.ui).toBe(260);
  }, 90_000);

  it('pays a strategy shift in SKR', async () => {
    say('shift', await send(payShiftIxs(owner.publicKey, 20, 'Night Shift'), { owner: sign }));
    expect((await readOwner(owner.publicKey)).skr.ui).toBe(240);
  }, 90_000);

  it('grants the agent a capped permission', async () => {
    say('grant', await send(grantIxs(owner.publicKey, agent.publicKey, 100), { owner: sign }));
    const v = await readOwner(owner.publicKey);
    expect(permissionOf(v, agent.publicKey)).toEqual({ live: true, leftUsd: 100, delegate: agent.publicKey.toBase58() });
    expect(v.stocks.NVDAx!.delegate).toBe(agent.publicKey.toBase58());
  }, 90_000);

  it('the agent buys inside it, and the allowance falls by exactly the spend', async () => {
    const { ixs, qtyRaw } = agentBuyIxs(owner.publicKey, agent.publicKey, 'NVDAx', 25, 240, 30, 'test buy');
    say('agent buy', await send(ixs, { signers: [agent] }));
    const v = await readOwner(owner.publicKey);
    expect(v.usdc.ui).toBe(STARTER_USDC - 25);
    expect(v.stocks.NVDAx!.raw).toBe(qtyRaw);
    expect(permissionOf(v, agent.publicKey).leftUsd).toBe(75);
  }, 90_000);

  it('the chain refuses the agent past its cap', async () => {
    const err = await send(overCapIxs(owner.publicKey, agent.publicKey, 150), { signers: [agent], skipPreflight: true }).catch((e) => e);
    expect(err).toBeInstanceOf(ChainRefused);
    say('over-cap (refused)', (err as ChainRefused).signature);
    expect((await readOwner(owner.publicKey)).usdc.ui).toBe(STARTER_USDC - 25);
  }, 90_000);

  it('the agent exits through its sell approval', async () => {
    const before = await readOwner(owner.publicKey);
    const { ixs } = agentSellIxs(owner.publicKey, agent.publicKey, 'NVDAx', before.stocks.NVDAx!.raw, 250, 30, 'test take-profit');
    say('agent sell', await send(ixs, { signers: [agent] }));
    const v = await readOwner(owner.publicKey);
    expect(v.stocks.NVDAx!.raw).toBe(0n);
    expect(v.usdc.ui).toBeGreaterThan(before.usdc.ui);
  }, 90_000);

  it('revoke stops everything, on chain', async () => {
    const v = await readOwner(owner.publicKey);
    say('revoke', await send(revokeIxs(owner.publicKey, v), { owner: sign }));
    const after = await readOwner(owner.publicKey);
    expect(permissionOf(after, agent.publicKey).live).toBe(false);
    expect(STOCKS.every((s) => after.stocks[s.symbol]!.delegate === null)).toBe(true);
    const err = await send(agentBuyIxs(owner.publicKey, agent.publicKey, 'TSLAx', 5, 380, 30, 'after revoke').ixs, { signers: [agent], skipPreflight: true }).catch((e) => e);
    expect(err).toBeInstanceOf(ChainRefused);
    say('buy after revoke', (err as ChainRefused).signature);
    console.log(JSON.stringify({ owner: owner.publicKey.toBase58(), agent: agent.publicKey.toBase58(), sigs }, null, 2));
  }, 120_000);
});

/*
 * The same loop when xorr's faucet is out of SOL: the owner pays fees and rent from their own devnet SOL, gives the
 * agent a little SOL with the permission, and the agent pays for its own trades. The faucet only signs as the stand-in
 * mints' authority — it needs no SOL. Needs a cluster that airdrops (a local validator): CLOCKIN_SELFPAY=1.
 */
const selfPay = process.env.CLOCKIN_LIVE && process.env.CLOCKIN_SELFPAY && process.env.EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET ? describe : describe.skip;

selfPay('when the faucet is dry, owner and agent pay their own way', () => {
  const owner = Keypair.generate();
  const agent = Keypair.generate();
  const sign = { sign: async (tx: Transaction) => (tx.partialSign(owner), tx) };
  const payer = { kind: 'owner' as const, pubkey: owner.publicKey };

  it('runs fund → grant (with agent gas) → agent buy → revoke with nobody but the owner paying', async () => {
    const { connection } = await import('./chain');
    const conn = connection();
    const air = await conn.requestAirdrop(owner.publicKey, 1e9);
    for (let i = 0; i < 30 && !(await conn.getSignatureStatuses([air])).value[0]?.confirmationStatus; i++) await new Promise((r) => setTimeout(r, 500));
    await send(fundStarterIxs(owner.publicKey, 500, owner.publicKey), { owner: sign, payer });
    await send(grantIxs(owner.publicKey, agent.publicKey, 50, owner.publicKey, 30_000_000), { owner: sign, payer });
    expect(await conn.getBalance(agent.publicKey)).toBe(30_000_000);
    const { ixs } = agentBuyIxs(owner.publicKey, agent.publicKey, 'AAPLx', 20, 250, 0, 'self-pay buy', agent.publicKey);
    await send(ixs, { signers: [agent], payer: { kind: 'signer', signer: agent } });
    const v = await readOwner(owner.publicKey);
    expect(v.usdc.ui).toBe(480);
    expect(permissionOf(v, agent.publicKey).leftUsd).toBe(30);
    await send(revokeIxs(owner.publicKey, v), { owner: sign, payer });
    expect(permissionOf(await readOwner(owner.publicKey), agent.publicKey).live).toBe(false);
  }, 120_000);
});
