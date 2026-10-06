# HANDOFF: xorr · CLOCK IN

Status as of **2026-10-06 (IST)**, written by the build agent. It covers only what was run and seen working.
Deadline: **2026-10-09 06:59 UTC** (Oct 8, 23:59 PDT).

## What this is

A Seeker-first, devnet-only build of xorr for Solana Mobile CLOCK IN. Everything new is in `src/clockin/`,
`app/(clockin)/`, `app/start.tsx`, `tools/clockin/` and `plugins/with-release-signing.js`. Setting
`EXPO_PUBLIC_CLOCKIN=1` selects it. Without that, the app builds as the hosted STOCKLANA mainnet app, unchanged.
In this build the root and the hosted tab shell redirect to `/today`, and nothing that talks to the hosted executor is
mounted.

## Verified (and how)

| What | Evidence |
|---|---|
| Unit rules: streak, tiers and shifts, the agent engine (exits, guard, pacing, allowance, DST-aware Nasdaq session), the brief, *Ask your agent* answers without a model, the faucet-busy wording | `npx vitest run src/clockin`: 19 passed (the on-chain suites skip without `CLOCKIN_LIVE`) |
| The whole permission loop **on chain**: fund with no owner signature → clock-in memo and reward → SKR shift payment → `ApproveChecked` grant → agent buy as delegate (allowance falls by exactly the spend) → over-cap transfer **refused by the token program** → agent sale through its approval → `Revoke` → buy after revoke **refused** | `CLOCKIN_LIVE=1 npx vitest run src/clockin/chain.devnet.test.ts` against a local `solana-test-validator`: 8/8 |
| The same loop when xorr's faucet has no SOL: owner pays fees and rent, the agent receives 0.03 SOL with the grant and pays for its own trades | same file, `CLOCKIN_SELFPAY=1`: 9/9 |
| The app on **iPhone 17 Pro Max simulator** (debug build, Metro 8481), against a local validator on :4400: Start → guest wallet → funded (1,000 dUSDC, 250 dSKR) → grant 100 → agent bought NVDAx/TSLAx/MSFTx at live Jupiter prices → *Test the cap* refused on chain → clock-in day 1 (+15 dSKR) → agent bought SPYx → Night Shift paid with 20 dSKR → revoke | Signatures in the JS log; screenshots `clockin/screens/01…12`. Taps were driven by a dev-only remote (`src/clockin/autopilot.ts`, `tools/clockin/remote.mjs`, compiled out of release builds) because nobody was at the simulator |
| **Device-mint bootstrap** (no shared stand-in set on the cluster): the phone created its own 7 mints, funded the wallet, granted with agent gas, the agent bought TSLAx paying its own fee, and the cap held | same simulator session, after emptying `devnet.json` |
| Live prices | Jupiter `price/v3` (lite-api, then api.jup.ag on 429), 20 s cache, 60 s back-off. Seen live in the app |
| Release APK builds and is signed with xorr's own release key (not the debug key) | `tools/clockin/build-apk.sh`. `apksigner verify --print-certs` → `CN=xorr CLOCK IN, O=xorr, C=IN`. The MWA native module (`com.solanamobile.mobilewalletadapter.reactnative`) is in the dex |

## NOT verified (be honest about these)

- **The APK has not run on any Android device or emulator.** By the user's order, the shared Android emulator is not to
  be used (it took 18 GB of RAM). The only emulator contact was an earlier smoke APK that installed (`Success`) on
  `clockin_seeker`, where the launch step failed in the shared script before any screen was captured. So no Android
  screen, and no **Mobile Wallet Adapter / Seed Vault** signing, has been seen working. MWA is wired as the docs
  describe (`authorize({chain:'solana:devnet'})`, base64 → base58 address, `signTransactions`, cached `auth_token`,
  friendly "no wallet found" text), but it is untested.
- **Solana devnet itself.** Every on-chain run above used a local validator. Devnet's public faucet refused every airdrop
  to xorr's devnet faucet key `GwayahZaN7rMXK5jkNXKu7ndHRw2mcXbbq1qEPJiEeAe` (rate limit, all day Oct 6), so **no
  devnet transaction has been sent and no devnet program or mint IDs exist yet**. The app does not depend on that faucet
  (see "How the APK behaves on devnet").
- Privy email sign-in in the CLOCK IN build: the code path exists (`PrivyEmail` in `app/start.tsx`, signing through
  Privy's embedded Solana wallet), but it was not exercised. It needs an inbox.
- The Seeker Genesis Token check and the real-SKR read (mainnet, read-only) ran against a fresh guest wallet and
  correctly returned none and 0. They have not been seen returning a positive result.
- Notifications: the morning-brief scheduling code ran (the iOS permission prompt appeared). No delivered notification
  was observed.
- The optional OpenRouter narration (`src/clockin/ai.ts`) was not run (no key, and none must ship).

## How the APK behaves on devnet

1. If the shared stand-in set in `src/clockin/devnet.json` exists on devnet **and** xorr's faucet key holds ≥ 0.02 SOL,
   the faucet pays every fee and rent. A judge needs nothing.
2. If the shared set exists but the faucet is dry, the owner pays fees from devnet SOL. The app asks devnet's own faucet
   on the owner's behalf, and *Get devnet SOL* on Today and Me retries. The agent gets 0.03 SOL with the grant.
3. If there is no shared set (the **current state** of the committed `devnet.json`), the phone creates its own seven
   mints on first run (about 0.011 SOL of rent, paid from a 1 SOL devnet airdrop to the owner), and then case 2 applies.
   **The risk:** this path depends on devnet's public faucet granting an airdrop to the judge's phone, and that faucet
   rate-limits per IP. When it refuses, the app does not dead-end. Start shows "Devnet's free faucet is busy (it
   rate-limits test SOL). Nothing is wrong with your wallet — try again in a minute or two." with a **Try again** button,
   and Today shows **Try setting up again** and **Get devnet SOL**. A smaller 0.05 SOL request is tried automatically
   after a refused 1 SOL one. Funding the shared faucet (step 1 below) removes the risk entirely.

## What the user must do

1. **Best first: fund the shared devnet faucet, then run one command.** Send ≥ 0.1 devnet SOL (1 is comfortable) to
   `GwayahZaN7rMXK5jkNXKu7ndHRw2mcXbbq1qEPJiEeAe` (for example from https://faucet.solana.com while signed in, or any
   devnet wallet). Then:
   ```bash
   cd "/Volumes/Extreme SSD/Projects/clockin/xorr-clockin" && scripts/devnet-go.sh --push
   ```
   The script (1) checks the faucet's balance, (2) creates the shared devnet stand-in set (`src/clockin/devnet.json`),
   (3) runs the whole loop on devnet and writes every signature, with explorer links, to `clockin/DEVNET-RUN.md`,
   (4) rebuilds and copies the release APK (printing its new sha256), and with `--push` commits the mint list and run log
   and pushes them. Afterwards, copy the mints, the links and the new sha256 into `clockin/SUBMISSION.md`.
   Without funding, the APK still works: each phone creates its own set (see above), but every judge then needs a
   devnet airdrop to succeed from their phone.
2. **Run the APK on a real Android phone (ideally a Seeker)** before submitting, and record the demo there
   (`clockin/DEMO-SCRIPT.md`). Install a wallet if the phone has none. Check: *Connect wallet · Seed Vault* opens the
   wallet, the grant and clock-in sign, and *Test the cap* shows a refused devnet transaction.
3. Host the APK as a direct download (for example a GitHub Release asset on `nickthelegend/xorr-clockin`) and put the
   URL in the submission form. The file is at `/Volumes/Extreme SSD/Projects/clockin/apks/xorr-clockin.apk`. Its sha256
   is in `clockin/SUBMISSION.md`.
4. Render the deck from `clockin/PITCH.md` (Google Slides or a Drive PDF) and record a **narrated** demo of about 3 minutes.
5. Keep the release keystore safe: `/Volumes/Extreme SSD/Projects/clockin/.keys/xorr-clockin-release.keystore`, with its
   passwords in `.keys/xorr-clockin.signing.properties` next to it. A dApp Store update needs the same key. Back both up
   outside this disk.
6. Register and submit on https://solanamobile.radiant.nexus yourself (the agents must not). Answer the "porting"
   question honestly: xorr existed (STOCKLANA, mainnet). New for CLOCK IN: the Seeker/MWA wallet path, the daily
   clock-in and brief, the SKR earn/spend/hold economy, the Seeker Genesis Token perk, the on-device agent on devnet,
   notifications, and the release APK.

## Exact commands

```bash
source "/Volumes/Extreme SSD/Projects/clockin/env.sh"
cd "/Volumes/Extreme SSD/Projects/clockin/xorr-clockin"
npm ci
npx vitest run src/clockin                                   # unit rules (on-chain suites skip without CLOCKIN_LIVE)
# local validator loop (what was verified):
solana-test-validator --ledger test-ledger --rpc-port 4400 --faucet-port 4402 --gossip-port 4403 --dynamic-port-range 4410-4499 --quiet &
CLOCKIN_RPC=http://127.0.0.1:4400 npx tsx tools/clockin/setup-devnet.ts      # localnet set (do NOT commit that devnet.json)
set -a; . ./.env.local; set +a; CLOCKIN_LIVE=1 CLOCKIN_SELFPAY=1 EXPO_PUBLIC_CLOCKIN_RPC=http://127.0.0.1:4400 npx vitest run src/clockin/chain.devnet.test.ts
# iOS simulator (iPhone 17 Pro Max B60FAA19-…): prebuild, pods (needs LANG=en_US.UTF-8), build, Metro on 8481
EXPO_PUBLIC_CLOCKIN=1 npx expo prebuild -p ios && (cd ios && LANG=en_US.UTF-8 pod install)
xcodebuild -workspace ios/xorr.xcworkspace -scheme xorr -configuration Debug -sdk iphonesimulator \
  -destination id=B60FAA19-1F14-4F56-BCA9-263D22A2046F -derivedDataPath "$CLOCKIN_DERIVED_DATA/xorr" RCT_METRO_PORT=8481 build
EXPO_PUBLIC_CLOCKIN=1 npx expo start --port 8481
# release APK (devnet forced; heap capped at 3g, one daemon, stopped afterwards)
tools/clockin/build-apk.sh
```

## Decisions made (autonomously)

- **No server.** The CLOCK IN build never calls the hosted executor (Railway) or the Vercel app. The live mainnet stack
  was not touched, and no mainnet transaction was sent. Mainnet is used only for two **reads**: the owner's real SKR
  balance and the Seeker Genesis Token check.
- **The agent runs on the phone.** Its key, kept in the OS keystore, is an SPL delegate. That is the same trust model as
  the hosted xorr with the key moved to the device, so the APK works with no backend.
- **Stand-ins fill at live prices.** Real xStocks do not exist on devnet. A devnet "venue" (the faucet key) takes dUSDC
  and mints the stand-in at Jupiter's live mainnet price, less the tier fee. It is labelled on every screen.
- **SKR is earned, spent and held, not staked.** The CLOCK IN SKR prize excludes staking integrations. Real SKR held on
  mainnet counts toward the tier and is only read.
- **The devnet faucet key ships in the APK** (`EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET`, from `.env.local`, never committed).
  It is a devnet-only key: anyone can extract it and spend its devnet SOL, which is why the app falls back to self-paid
  fees and per-device mints.
- **AI:** decisions are the deterministic engine's, with a reason for each. A model is optional, uses the owner's own key
  and only narrates. No API key ships.
- **Ports used:** 4400–4403 and 4410–4499 (local validator), 4405 (dev remote), 8481 (Metro). Simulator:
  B60FAA19-1F14-4F56-BCA9-263D22A2046F.

## Incident to know about

On Oct 6 around 20:17 IST, while the emulator lock was held by xorv, a script of mine ran `adb install` and `am start`
against the running emulator-5554 for about a minute, because I didn't check the lock before running it. My own
emulator never started. The lock was never touched. This was reported to the coordinator. No emulator has been used
since.

## Cleanup done / left

- Gradle daemons are stopped after each build. `android/` and `ios/` are generated (gitignored). Build outputs:
  `android/app/build` (about 1–2 GB) and `$CLOCKIN_DERIVED_DATA/xorr` (iOS). Delete them when finished.
- `test-ledger/` (local validator, gitignored) can be deleted.
