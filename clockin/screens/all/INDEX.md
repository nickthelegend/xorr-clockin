# Screen census: xorr · CLOCK IN 1.2.0

Every screen and state reachable in the CLOCK IN build, captured in flow order on the iPhone 17 Pro Max simulator
(debug build, local Solana validator, devnet guest wallet, per-phone stand-in mints) on 2026-10-07. Screens are
resized to 1600 px tall.

## What is reachable

The route guard (`ClockinRouteGuard` in `app/_layout.tsx`) allows exactly these routes and sends anything else to
Home:

- `/start`
- `/intro`
- `/setup`
- `/` (Home, with tabs Agents, Brief, Stocks and SKR)
- `/desk` (Safety)
- `/agent/{momentum|dip|nightShift|indexKeeper}`
- `/skr`
- `/me` (Profile)
- `/activity`
- `/ask` (raises the Messages drawer)
- `/legal/{terms|privacy|risk}`

The Messages drawer and the stop curtain are overlays, not routes.

**Hidden in this build** (83 hosted-app routes, all redirected to Home): `/alerts`, `/allocation`, `/allowlist`, `/approvals`, `/asset`, `/audit`, `/auto-close`, `/backtest`, `/balance`, `/basename`, `/bot`, `/briefing`, `/business`, `/catchup`, `/chart`, `/compare`, `/coverage`, `/crosschain`, `/crosscheck`, `/delegation`, `/deposit`, `/disposals`, `/earnings`, `/explain`, `/explore`, `/export`, `/flatten`, `/funding`, `/futures`, `/graph`, `/history`, `/inbox`, `/judge`, `/limit-orders`, `/limits`, `/markets`, `/metrics`, `/movers`, `/network`, `/networks`, `/not-here`, `/notifications`, `/oracle`, `/order`, `/perp`, `/pnl`, `/policy`, `/portfolio`, `/position`, `/pre-ipo`, `/profile`, `/proposals`, `/rates`, `/recovery`, `/return-funds`, `/risk`, `/roster-compare`, `/route`, `/runs`, `/safety`, `/schedule`, `/search`, `/sell-everything`, `/send`, `/settings`, `/sources`, `/spend`, `/sponsors`, `/stocks`, `/strategies`, `/strategy`, `/strategy-library`, `/swap`, `/system`, `/tokens`, `/venues`, `/verify`, `/voice`, `/watchlist`, `/withdraw-everything`, `/xstock`, `/xstocks`, `/yield`, plus `(onboarding)/*`, `_dev/*` and
any `agent/*` other than the four above. Screen 40 shows the redirect.

## Index

| # | Route / overlay | What it shows | How to reach it | Known issue |
|---|---|---|---|---|
| 01 | `/start` | xorr's welcome: the coin hero, the tagline, Get started, Sign in, the legal line and a Devnet tag | First launch, or Disconnect in Profile | On Android the primary button is **Connect wallet** (MWA / Seed Vault), with a guest-wallet link below. This capture is iOS, where the primary is the guest wallet |
| 02 | `/start` (email step) | Privy email sign-in, using the Field recipe | Tap **Sign in** | Privy login itself is not exercised (it needs an inbox) |
| 03–05 | `/intro` | Three intro screens: Meet your agent; A permission you can take back; Clock in every morning | After connecting, the first time on this device | — |
| 06 | `/setup` (step 1) | Guided first grant: the cap Stepper and Sign permission | **Set up your agent** on intro 3 | — |
| 06b–06d | `/setup` (steps 2, 3 and done) | The agent's first $10 buy; Test the cap refused on chain; "You're set up" with three transactions | Continue through setup | — |
| 07 | `/` Home | Not granted: the balance, the clock-in row, the ticker ("give it a permission") and the Agents tab with a NOT GRANTED chip | Skip setup | — |
| 08 | `/` Brief tab | The brief before any permission (the agent is only watching) | The Brief tab | — |
| 09 | `/` Stocks tab | Empty state with "Give it a permission ›", cash and the market with issuer logos | The Stocks tab | — |
| 10 | `/` SKR tab | Tier, dSKR, real SKR (read-only), Seeker Genesis Token | The SKR tab | — |
| 11 | `/desk` | Safety, not granted: the cap Stepper, wallet and agent key, links, Sign permission | The NOT GRANTED chip, or Trade | — |
| 12 | `/agent/momentum` | Agent page with no permission: HIRED (included in the tier), stats, what it would do, Look now disabled | Tap Momentum Scout on Home | — |
| 13 | `/agent/nightShift` | NOT HIRED, **Hire for 24h · 20 SKR** | Tap Night Shift, or the "Hire a shift" tile | — |
| 14 | `/desk` | Safety, live: cap rings, Test the cap row, hold **Stop all trading** | Sign permission | — |
| 15 | `/desk` | The cap held: a ConsequenceCard plus "View transaction ›" | Test the cap | — |
| 16 | `/agent/momentum` | After **Look now**: BUY rows with transactions and HOLD reasons | Look now | — |
| 17 | `/` | Granted, before clocking in: the clock-in row, and the ticker "watching · $N left to spend", ARMED | Home | — |
| 18 | `/` Brief | After clocking in: the card is gone, the ticker says "Clocked in · 1-day streak", the brief has notes and "What it did just now" | **Clock in** | — |
| 19 | `/` Brief, scrolled | Fill receipts (devnet venue, signature); the header stays clean when scrolled | Scroll the Brief tab | — |
| 20 | `/` Stocks | Holdings with average cost and P&L, then cash and the watchlist | The Stocks tab | — |
| 21 | `/` SKR | The SKR tab after earning | The SKR tab | — |
| 22 | Messages drawer | xorr's conversations list: the CLOCK IN agents, hired first, with the "Hire a shift" plus | The tab bar's chat button | The drawer follows the app's dark style (app.json forces dark), the same as xorr-xlayer |
| 23–24 | Messages, conversation | The agent answers "What did you buy?" and "How is NVDAx doing?" from its own numbers | Open an agent in the drawer | With an OpenRouter key (Profile → Advanced) a model answers instead. Not exercised |
| 25 | `/agent/nightShift` | Hired: "Night Shift is on shift for 24 hours", with the transaction | Hire for 24h | — |
| 26–27 | `/agent/dip`, `/agent/indexKeeper` | Included in the tier; NOT HIRED with Hire for 15 SKR | Home tiles | — |
| 28–29 | `/skr` | The tier with the ink meter, a StatRow, what you hold, Seeker, earn, spend, tiers ("You" tag) | The SKR tab → "Earn, spend and hold SKR" | — |
| 30–31 | `/me` | Profile: avatar, Devnet tag, address pill, links, Reminders (SwitchRow), Wallet, Activity, About, Legal, Advanced (OpenRouter key Field), Session → Disconnect | Avatar or bell on Home | The "About" line shows the dev RPC (127.0.0.1) here. The release APK shows api.devnet.solana.com |
| 32 | `/activity` | Every devnet action, newest first, each with "View transaction ›" | Safety → Activity | — |
| 33–34 | Stop curtain | "Stopping all trading", then "Trading stopped" with the confirmed signature | Hold **Stop all trading** | — |
| 35 | `/desk` | Safety, stopped: STOPPED, "Grant again whenever you want it back" | After the stop | — |
| 36 | `/` | Home, stopped: the ticker says "you revoked the permission", STOPPED chip | Home | — |
| 37–39 | `/legal/terms`, `/legal/privacy`, `/legal/risk` | The documents, each with a CLOCK IN note on top | Welcome legal line, or Profile → Legal | The documents were written for the hosted xorr. The note on top says which parts do not apply to the devnet build |
| 40 | (unknown route) | The route guard lands any hosted-app route on Home | Any other deep link | — |
| 41 | `/` | Offline after a session: the last-known balance stays, "Can’t reach Solana devnet right now. Your tokens are safe on chain…", **Try again**. (On a cold start with no cached view, the balance reads a dimmed "—" and the chip says CAN’T CHECK) | Stop the RPC, then return to Home | — |
| 42 | `/desk` | Offline: UNKNOWN, "Couldn't read your permission" | RPC down | — |
| 43 | `/` | Back online after a retry | RPC back | — |

## Not captured (and why)

- **The Android-only MWA states:** the Connect wallet button, the Seed Vault sheet and "No Mobile Wallet Adapter wallet
  on this phone". iOS has no MWA, and the Android emulator is off-limits on this machine.
- **The faucet-dry "Get devnet SOL" state.** It needs an owner with under 0.003 devnet SOL while xorr's faucet is
  empty. On the local validator the owner always has an airdrop.
- **The iOS notification permission prompt and a delivered brief or streak reminder.** Nobody could tap the prompt on
  the simulator, and iOS keeps no pending notification without permission.
- **The first-load skeleton.** It is on screen for well under a second against a local validator.
