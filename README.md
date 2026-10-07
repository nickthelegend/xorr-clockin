<p align="center">
  <img src="assets/brand/xorr-banner.png" width="820" alt="XORR. — A bot that trades your capital while you get on with your life." />
</p>

# xorr · CLOCK IN: an AI stock agent you check in with every morning, on Seeker

**Built for the [Solana Mobile CLOCK IN hackathon](https://solanamobile.radiant.nexus) (Oct 2026).** xorr is an AI agent
that trades tokenized US stocks (Backed's xStocks) on Solana inside an SPL permission you can revoke in one tap. It never
holds your money. The CLOCK IN build makes it a phone habit:

- **Seeker-first wallet.** *Connect wallet* (Seed Vault) is the first button on Android. It uses Mobile Wallet Adapter
  2.3, which is Seed Vault on a Seeker and Phantom, Solflare or Backpack elsewhere. Privy email sign-in and a devnet guest
  wallet are next to it, for iOS and for phones without a wallet.
- **A morning clock-in.** Open the app and the agent's brief is waiting. It covers what your book did, what moved since
  you last clocked in, what the agent plans and why. One signature clocks you in (an on-chain memo), keeps your streak and
  pays you SKR. The agent then takes its look and trades. A local notification at 8:30 reminds you, with your streak on
  the line.
- **SKR you earn, spend and hold** (not staking). Clocking in earns SKR, and streaks and a Seeker earn more. SKR pays for
  your agent's premium strategy shifts for 24 hours. The SKR you hold sets a tier that unlocks strategies, cuts the fee on
  every agent fill and multiplies rewards. Real SKR in your wallet on mainnet counts toward your tier and is read only,
  never moved. A **Seeker Genesis Token** in the wallet adds 1.5× to every clock-in.
- **The permission you can feel.** Grant the agent 50, 100 or 250 dUSDC. Watch it buy. Tap *Test the cap* and the agent
  tries to move more than you approved, and the token program refuses on chain. Tap *Revoke* and it can move nothing.

**This build runs on Solana devnet with test tokens, labelled on every screen.** dUSDC, dSKR (the stand-in for SKR) and
five xStock stand-ins (NVDAx, TSLAx, AAPLx, MSFTx, SPYx) are devnet mints. They fill at **Jupiter's live prices for the
real xStocks**. No real money moves, and the CLOCK IN app never talks to xorr's hosted mainnet service.

| | |
|---|---|
| Android APK | `xorr-clockin.apk`, a release build signed with xorr's own key. See [clockin/SUBMISSION.md](clockin/SUBMISSION.md) for the download link and sha256 |
| Submission | [clockin/SUBMISSION.md](clockin/SUBMISSION.md) · pitch [clockin/PITCH.md](clockin/PITCH.md) · demo script [clockin/DEMO-SCRIPT.md](clockin/DEMO-SCRIPT.md) |
| Status and how to run | [HANDOFF.md](HANDOFF.md) |
| Screens | [clockin/screens/](clockin/screens/) |

## What a day looks like

1. **Open** — Home, in xorr's design: the total balance, the live line, the daily clock-in card, and the sheet of Agents, the morning Brief, Stocks and SKR.
2. **Clock in** — one signature (Seed Vault sheet on a Seeker). The streak goes up and dSKR lands. The agent looks right
   after: exits first, then the guard, then each strategy. It buys inside your permission and tells you why.
3. **Check the book** — positions at live prices, P&L against cost, and every action on the trail with an explorer link.
4. **Spend SKR** — hire *Night Shift* (buys the off-hours discount) or *Dip Buyer* for 24 hours, or hold enough for a tier.
5. **Stop it** — *Revoke* signs an SPL `Revoke` on every account that names the agent.

## How it is built (the CLOCK IN parts)

Everything new is in [`src/clockin/`](src/clockin) (logic and `screens/ClockinHome.tsx`) and the screens `app/start.tsx`, `app/desk.tsx`, `app/skr.tsx`, `app/me.tsx`, `app/ask.tsx` — all drawn in xorr's own design system (the xorr-xlayer UI: same tab bar, Home sheet, Safety layout, type and colour).

| Piece | What it does |
|---|---|
| `mwa.android.ts` | Mobile Wallet Adapter `transact` → `authorize({chain:'solana:devnet'})` → `signTransactions`; caches the auth token so later signatures reauthorize silently. `mwa.ts` is the iOS/web stand-in that says MWA is Android-only |
| `useOwner.ts` | One `sign()` for Seed Vault/MWA, Privy's embedded wallet, or the devnet guest key (OS keystore) |
| `engine.ts` | The agent: take-profit +4% / stop −3%, the pool-vs-issuer **guard** (±1.2% in session, ±1.5% off-hours), pacing (one entry per stock per day, three per look), the permission's remaining allowance, and the brief written from the numbers. Pure and unit-tested |
| `chain.ts` | Every devnet transaction: starter funds, clock-in memo plus reward, `ApproveChecked` grant, agent buy/sell as SPL **delegate**, the over-cap attempt, `Revoke`, SKR shift payment. Read-only mainnet reads of real SKR and the Seeker Genesis Token |
| `tiers.ts` / `streak.ts` | The SKR loop (earn, spend, hold) and the daily streak |
| `desk.ts` | Runs the actions, picks who pays devnet fees (xorr's faucet while it has SOL, otherwise the owner and the agent), and keeps the trail |
| `notify.native.ts` | The 8:30 morning-brief notification and one per agent trade (local, no push server) |
| `ai.ts` | Optional: your own OpenRouter key (stored in the keystore, never shipped) lets a model narrate the brief and answer *Ask your agent*. Decisions stay the engine's |

**Why a delegate, not custody.** The agent key lives on your phone and is only an SPL delegate. The token program caps
what it can move at what you approved, and `Revoke` ends it. That is the same model as the hosted xorr, where the
delegate is a server key. The test `src/clockin/chain.devnet.test.ts` runs the whole loop against a cluster, including the
refusal past the cap and the refusal after a revoke.

### Run it

```bash
npm ci
# devnet stand-in mints (one-time; refuses mainnet). Writes src/clockin/devnet.json and .env.local (faucet key, gitignored)
CLOCKIN_FAUCET_KEYPAIR=~/.config/solana/xorr-clockin/faucet.json npx tsx tools/clockin/setup-devnet.ts
# tests: rules, then the full on-chain loop
npx vitest run src/clockin
set -a; . ./.env.local; set +a; CLOCKIN_LIVE=1 npx vitest run src/clockin/chain.devnet.test.ts
# the app (iOS simulator / Android device)
EXPO_PUBLIC_CLOCKIN=1 npx expo start --port 8481
# the release APK, signed with the key named in ../.keys (outside git)
tools/clockin/build-apk.sh
```

## History: STOCKLANA

xorr was built for **STOCKLANA** (Solana Foundation, Sept 2026) as a hosted app on Solana mainnet. Its agent
trades real xStocks through Jupiter from a server-held delegate, with an off-hours guard against Pyth's equity feeds and
on-chain proofs on a mainnet fork. That README, with the mainnet accounts, the fork proofs and their limitations, is in
[docs/stocklana/README-stocklana.md](docs/stocklana/README-stocklana.md). Before that, xorr was a Base app
([docs/base/README-base.md](docs/base/README-base.md)). The hosted mainnet app is untouched by this build. Setting
`EXPO_PUBLIC_CLOCKIN` unset builds it as before.
