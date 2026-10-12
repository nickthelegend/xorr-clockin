# XORR 1.3.1: every-button audit (no mocks)

Run on 2026-10-12 with a **Release** build (`xcodebuild -configuration Release`, `EXPO_PUBLIC_CLOCKIN=1`, Solana devnet)
on the iPhone 17 Pro Max simulator (`B60FAA19-…`), guest wallet `6xSZNsuVHBhFCAcS8rMwt4VKJ9GXZTrpZSyL5qpVDNbp`. The UI is
xorr-xlayer's. Every on-chain row is a real devnet transaction checked with `solana confirm -u devnet <sig>`: the
successful ones are `Finalized`; the two cap tests are, as intended, landed transactions that the SPL Token program
**failed** with `insufficient funds` (custom error 0x1). Fees are paid by xorr's devnet faucet key
`GwayahZaN7rMXK5jkNXKu7ndHRw2mcXbbq1qEPJiEeAe`.

## The loop, from the app, this session

| Step | Signature |
|---|---|
| Clock in (day 2, +23 dSKR; the agent takes its look right after) | `3DVXC5Fr2ywKWyptAvzWnBMQDtR7BFcNMQjR7GYNea2KiVnZZPU6Mr4LncR1MnwkWNDs2DmsLyziCjGeZrGxug73` |
| **Agent buy** as the delegate: $25.00 AAPLx at Jupiter's live price | `2myDhKJ88tjVtLpEJzGT4znw28dLY52Npeei4RtLysQXN7V8MCR9CNqoH6riWXXUNM5s4e2agHfR227v2xf6DWyJ` |
| **Over-cap refused** (Test the cap: $115 with $65 approved) | `5jEqLQXAoej74mpukFpFCr7LHnZepvEZHDsFFPbdeys6zBaXoDLEbMhph1sszfesjWStVnBV21e1hbFoVzSXKWsC` (failed on chain, as intended) |
| **Revoke** (hold "Stop all trading") | `3sDKrKdabmXLSvear8UMQxeqNg527LqNxfVfcL1hgTrcZXsrajLXKrKJmpzBR53bEqx1FMX74CaDtDihFP856XT1` |
| **Grant cap** again ($100, `ApproveChecked` + sell approvals) | `QMHMfbJSMaWRnniG6qRzPQXFJymp2WPhN5YFESW9HsfHXkgEBXV1XawFUHDUhT9bMTWHxHnAYuTvYDJACEvWCdY` |
| Hire Night Shift for 24 h, paid 20 dSKR | `4tt4F9Hb83y4CNszacdHTKerwTnDzGNYR6Jxjz2xuarjKpiYb3m3N1LHxPegNTrnE1HBTLdHh1B7rPePXJCGb3wh` |
| **Agent buy** under the new grant: $25.00 MSFTx | `3JsSvqUhJxPA1Ng2MnXG4DqL2JBLq6hJtBwSX9ZphzLcg4biAmFLBzZHX9pT8UXVBuD9QxCCaygvRuPY3rpnMTpo` |
| **Over-cap refused** again ($125 with $75 approved), 1.3.0 build | `2ghURH552gzNZGoQshWoxBCoFCjZHH1p48zpTKGqCzGPcB47d3whhNzDW3uBkrY5cwSNLkXLF3feJP8xy5gZaQQH` (failed on chain, as intended) |

The full scripted loop with sale and buy-after-revoke (Oct 11) is in [`DEVNET-RUN.md`](DEVNET-RUN.md).

## Are the numbers real?

- **Prices:** Jupiter `price/v3` for the real mainnet xStock mints (checked: NVDAx `usdPrice` 229.79, −0.26 % against
  the app's $229.80, −0.26 %). 20 s cache, 60 s back-off, `api.jup.ag` fallback.
- **Agent decisions:** `engine.decide` on those quotes, the on-chain allowance and the on-chain dUSDC balance; every
  HOLD/BUY reason on screen is the engine's own text. Fills are recorded at Jupiter's live price by xorr's devnet venue
  (test tokens, said on the receipt).
- **Book, holdings, cap, streak, dSKR, tier:** read from devnet token accounts; SKR on mainnet and the Seeker Genesis
  Token are read-only mainnet reads.
- **Ask your agent:** without the owner's own OpenRouter key it answers from the engine's numbers (Profile → Advanced
  says so). Added this round: "how much can you still spend?" now answers from the on-chain allowance.

## Controls

| Screen | Control | Expected | Result | Tx | Fix |
|---|---|---|---|---|---|
| Home | Clock in · +23 dSKR | Memo + reward, then the agent looks | Pass | `3DVXC5Fr…Gxug73`, buy `2myDhKJ8…DWyJ` | |
| Home | Avatar / bell | Profile | Pass | | |
| Home | Agents / Brief / Stocks / SKR tabs | Switch the sheet | Pass | | |
| Home | ARMED chip | Safety | Pass | | |
| Home → Agents | Agent tiles, Hire a shift | Agent screens | Pass | | |
| Agent | Hire for 24h · 20 SKR | dSKR payment | Pass (Night Shift hired) | `4tt4F9Hb…Gb3wh` | |
| Agent | Look now | The engine on live prices | Pass (HOLDs with reasons; a buy under the new grant) | `3JsSvqUh…MTpo` | |
| Brief | Recent trades → View transaction | Explorer | Pass | | |
| Brief | Fill receipt | Venue + proof | Printed the raw signature | | Now "View the transaction on Solana Explorer" |
| Brief | Ask your agent / Share | Messages / share sheet | Pass | | |
| Stocks | Holdings and market rows | Live quotes | Pass (Jupiter) | | |
| SKR | Earn, spend and hold SKR | SKR screen; rows to each shift | Pass | | |
| Safety | Test the cap | Over-cap transfer refused by the token program | Pass, twice | `5jEqLQXA…KWsC`, `2ghURH55…ZaQQH` | Detail now plain language, not a program log |
| Safety | Stop all trading (hold) | Revoke on chain, curtain | Pass | `3sDKrKda…856XT1` | Curtain shows an Explorer link, not a hash |
| Safety | − / + cap, Sign permission · $100 | Grant | Pass ($100 → $250 → $100, then granted) | `QMHMfbJS…WCdY` | |
| Safety | Your wallet / Agent key rows | Open on Explorer | Pass | | Addresses replaced with "Explorer" |
| Safety | Agents and shifts, Activity | Navigate | Pass | | Activity details without "SPL ApproveChecked"/program logs |
| Trade tab (⇅) | Momentum Scout | Agent screen | Pass | | |
| Ask tab | Theme, search, +, agent rows, chat send | Work | Pass | | Permission question answered from chain |
| Profile | Sign In With Solana line | Verified proof for this wallet | Pass (1.3.1) | | New |
| Profile | Copy address chip | Clipboard | Pass | | |
| Profile | Your agent / SKR / Ask your agent rows | Navigate | Not tapped from Profile (the same screens passed from Home) | | |
| Profile | Morning brief, time chips, Streak reminder | Schedule notifications | Pass (iOS permission granted) | | |
| Profile | Test tokens (expand), mint chips | Explain + Explorer | Pass | | |
| Profile | Terms, Privacy, Risk | Legal pages | Pass | | Stale version removed from Privacy |
| Profile | Advanced: OpenRouter key, model | Optional own key | Shown; no key entered by the tester | | |
| Profile | Address row | Explorer | Pass | | Shows "Open", not the address |
| Profile | Disconnect | Confirmation with consequences | Pass (confirmation shown; "Keep everything" kept the test account) | | |

Not re-run this round: the first-run onboarding (Start → guest → devnet setup), which the 1.2.4 round ran from a fresh
install on Oct 12; MWA and Privy sign-in (Android / inbox only).

## Mocks and dev text removed

None of the CLOCK IN screens used fake data; what changed is dev text: the raw signature and slot on fill receipts, the
short hash on the stop curtain, wallet and agent-key addresses on Safety and Profile, "SPL ApproveChecked …"/"SPL
Revoke …" and raw program-log lines in Activity, and mint prefixes in the setup entry. A receipt journal that blocked
every new transaction forever after one dropped transaction was fixed (shared with Polaris and XORV).

## Sponsor tech

- **Mobile Wallet Adapter** (Seed Vault on Seeker) with the labelled devnet guest wallet on iOS.
- **SKR:** dSKR, a labelled devnet stand-in, earned by clock-ins, spent on shifts, and counted for tiers; real SKR on
  mainnet is read (never moved) and counts toward the tier.
- **Seeker Genesis Token:** read-only mainnet check, 1.5× rewards when present.
- **Sign In With Solana** (new in 1.3.1): connecting with MWA asks for `sign_in_payload` (falling back to
  `signMessages`); the guest key signs the same message. Verified on the phone and re-checked on Profile
  ("Signed in with Solana · verified on this phone", seen on the iOS guest wallet).

## Still not real

- xStock trades fill against xorr's devnet venue at Jupiter's live price with test tokens; no real xStock moves.
- "Ask your agent" in words needs the owner's own OpenRouter key; without it the agent answers from its numbers.
