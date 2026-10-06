# xorr · CLOCK IN: submission

**Name:** xorr

**One-liner:** An AI agent that trades tokenized US stocks for you inside an on-chain permission you can revoke in one
tap. You clock in with it every morning on your Seeker.

## Problem

Handing a bot your money is a trust problem. Robo-advisors take custody and crypto bots take your keys. Tokenized US
stocks (xStocks) trade on Solana around the clock, while the shares behind them trade 6.5 hours a day. Nobody can watch
that gap all night, and nobody should have to trust a bot with their wallet to cover it.

## Solution

The permission is the product. You sign one SPL `ApproveChecked`, which makes the agent's key a **delegate** capped at
what you chose. The **token program**, not xorr, refuses anything past that, and one `Revoke` ends it. Inside the
permission the agent buys, takes profit and stops out, and it gives a reason for every decision. It compares the Solana
pool with the issuer's own mark for the share and holds when they have come apart.

## Why Seeker users come back daily

- **The morning brief.** Every morning the agent has written what your book did, what moved since your last clock-in,
  and what it plans. An 8:30 local notification reminds you, with your streak on the line.
- **The clock-in.** One Seed Vault signature (an on-chain memo) keeps the streak and pays **SKR**. The agent takes its
  look right after, so clocking in is also when things happen.
- **SKR to spend.** You earn SKR every day and spend it to hire your agent's premium strategies for 24 hours. Holding
  more raises your tier.

## Solana, MWA, SKR and AI

- **Mobile Wallet Adapter 2.3** (`@solana-mobile/mobile-wallet-adapter-protocol-web3js`) is the first button on Android
  (Seed Vault on a Seeker). It authorizes `solana:devnet` and caches the auth token, so later signatures need no
  reconnect. Privy email and a labelled devnet guest wallet are the alternatives (iOS has no MWA).
- **Solana devnet, end to end, with no server:** starter funds, the clock-in memo and reward, the `ApproveChecked` grant,
  agent buys and sales as SPL delegate, an over-cap attempt the token program refuses, `Revoke`, and SKR shift payments.
  Every action is on the in-app trail with a Solana Explorer link.
- **SKR (earn → spend → hold, no staking):** clocking in earns SKR, with more for streaks and 1.5× with a **Seeker
  Genesis Token**. SKR pays for 24-hour strategy shifts (Night Shift 20, Index Keeper 15, Dip Buyer 10). Holding SKR sets
  a tier (Bronze 100 / Silver 500 / Gold 2,000) that unlocks strategies, cuts the venue fee from 0.30% to 0% and
  multiplies rewards. **Real SKR** (`SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`) held on mainnet counts toward the
  tier; it is read and never moved. On devnet the loop runs on **dSKR, a stand-in mint labelled as such everywhere**.
- **AI agent:** the agent decides, executes and explains on its own. It runs on the phone, from live Jupiter prices and
  the issuer's mark, through rules you can read. Optionally, your own OpenRouter key lets a model narrate the brief and
  answer "Ask your agent". Without a key, the agent answers from its own numbers (a stock's decision, reason, price
  and position). Either way, the model explains decisions and never makes them.

## Devnet addresses and transactions

| | |
|---|---|
| Cluster | Solana devnet (`https://api.devnet.solana.com`) |
| Programs used | SPL Token `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`, Associated Token, Memo `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`, System. xorr deploys no program of its own: the permission is the token program's delegate |
| xorr devnet faucet / venue | `GwayahZaN7rMXK5jkNXKu7ndHRw2mcXbbq1qEPJiEeAe` |
| Shared stand-in mints | **Not created yet.** Devnet's faucet refused every airdrop on Oct 6. Until they exist, each phone creates its own stand-in set on first run (see HANDOFF.md). When created, they are listed in `src/clockin/devnet.json` |
| Devnet transaction links | **To be added** after the loop runs on devnet (`CLOCKIN_LIVE=1 npx vitest run src/clockin/chain.devnet.test.ts` prints each signature). Verified so far on a local validator only |

## Install the APK

- File: `xorr-clockin.apk`, a release build signed with xorr's own key (`CN=xorr CLOCK IN`), for arm64-v8a and x86_64.
- sha256: `a65b0c1f15a0fc1ae06d851e353bbfa16cdce3ba04bedddbd7ae1af91162fea6` (77 MB, built 2026-10-06 from commit 522b07c)
- Download: **APK URL (to be added: a GitHub Release asset)**
- Install: allow installs from your browser or file manager, open the APK, then launch **xorr**. On a Seeker, tap
  *Connect wallet · Seed Vault*. On another phone, install Phantom or Solflare, or use *Try with a devnet guest wallet*.
- Everything runs on Solana devnet with test tokens. No real money is involved.
- **If the app says "Devnet's free faucet is busy":** devnet's public faucet rate-limits test SOL per IP. Tap **Try
  again** after a minute. This only happens while xorr's shared devnet faucet is unfunded, when each phone sets up its
  own stand-in tokens from a devnet airdrop. Once the shared faucet is funded (see HANDOFF.md), the app pays every fee
  and no airdrop is needed.

## Links

- Repository: https://github.com/nickthelegend/xorr-clockin
- History: built for STOCKLANA as a hosted Solana mainnet app ([docs/stocklana/README-stocklana.md](../docs/stocklana/README-stocklana.md))

## Team

nickthelegend (xorr).
