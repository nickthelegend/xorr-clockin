# xorr listing copy

Paste these into the Publisher Portal. Character counts include spaces. The same text is in `dapp-store/config.yaml`.

Three facts must stay true in every line of this copy:

- **This is a devnet build.** Every balance is a test token.
- **The agent trades devnet stand-ins** (dUSDC and "x" stock tokens minted for this build) at **live mainnet prices** read from Jupiter. It does not trade real xStocks.
- **dSKR is the devnet stand-in for SKR.** Real SKR on mainnet is only read.

If any of these changes, rewrite the copy.

## dApp name (portal maximum: 25)

```
xorr
```
4 characters. This is the name the APK shows (`application-label: 'xorr'`).

## Subtitle / short description (maximum: 30)

```
An agent for tokenized stocks
```
29 characters. Alternatives: `Your trading agent, on a cap` (28) and `Hire an agent. Keep your keys` (29).

## Description

```
xorr is an AI trading agent for Solana Seeker that works inside a limit you sign and can take back in one tap.

You give your agent one on-chain permission: an SPL token delegate capped at the amount you choose. Solana's token program, not xorr, refuses anything beyond it. Inside that cap the agent buys, takes profit and stops out on tokenized US stocks, and every decision comes with its reason.

• Clock in every morning: one signature keeps your streak and earns dSKR, and your agent takes its look right after. A morning brief tells you what your book did, what moved, and what it plans next.
• The cap holds: try "Test the cap" and watch the chain refuse a transfer above what you approved.
• Stop everything in one tap: the permission is revoked on-chain, and your funds never leave your wallet.
• Ask your agent what it bought and why. It answers from its own numbers. If you add your own OpenRouter key, a model can phrase the answer, but it never makes the decisions.
• Hire strategies for a day with dSKR: Momentum Scout, Dip Buyer, Night Shift and Index Keeper. A higher tier lowers fees and raises rewards. Seeker Genesis Token holders earn 1.5x.
• Sign in with Mobile Wallet Adapter (Seed Vault on Seeker), Privy email, or a labelled devnet guest wallet.

What this build is: a Solana devnet build with test tokens only. No real money moves. The agent trades devnet stand-ins for tokenized stocks at live mainnet prices from Jupiter, so it behaves like the real thing without holding real assets. dSKR is a devnet stand-in for SKR; your real SKR and Seeker Genesis Token are only read on mainnet, never moved. Nothing in xorr is investment advice.
```

## Release notes ("What's new")

### 1.2.1 (versionCode 4, current `main`)

APK sha256: `d3d953cf2b29a93c1c9231966ba3d25384c2cbf5820e93281893728ffef0203c`

```
• Privacy page rewritten for this build: what stays on your phone, and exactly what each service sees.
• Disconnect now deletes this phone's keys and signs your wallet out, after a confirmation.
• Stand-in tokens use neutral ticker marks instead of company logos.
• The streak reminder has its own switch. Offline states show a clear note with a retry.
• Android: a proper notification icon and a themed (monochrome) app icon.
Devnet build with test tokens; stand-ins fill at live prices.
```

Short form for `dapp-store --whats-new`:
```
Accurate privacy page, Disconnect deletes keys, neutral token marks, streak reminder switch, Android icons.
```

### 1.2.0 (versionCode 3)

```
• First run: a three-screen intro and a guided setup. Sign a cap, watch the agent's first $10 buy, then watch the chain refuse an over-cap transfer.
• The morning brief arrives at the time you choose, and an evening reminder warns before your streak lapses.
• Smoother: a rising-tile motion, counting balances, a stop curtain on revoke, and skeleton placeholders while data loads.
• Clear offline, empty and error states, with retries.
• Accessibility: larger text support, 44 pt touch targets, and labelled tabs, switches and streak days.
• No microphone or foreground-service permissions.
Devnet build with test tokens; stand-ins fill at live prices.
```

Short form for `dapp-store --whats-new`:
```
Guided setup, morning brief at your time, streak reminders, offline states and accessibility. Devnet build, test tokens.
```
**The first store release must carry versionCode 5 or higher**, because the hackathon APK judges install is versionCode 4 (1.2.1; see `PUBLISH.md`).

## Category

**Finance.** The docs say Solana Mobile places apps "under an appropriate category" ([unverified] whether the publisher can choose). Don't label it Games.

## Keywords (if the form has a field)

```
AI agent, trading bot, tokenized stocks, xStocks, Solana, Seeker, SKR, Mobile Wallet Adapter, on-chain permission, devnet, daily brief, streak
```

## Testing instructions for the reviewer

```
Open xorr and tap Get started to see the three-screen intro. Choose Mobile Wallet Adapter (Seed Vault/Phantom/Solflare on devnet), Sign in with Privy email, or the devnet guest wallet. Setup: set a cap, sign the permission (an SPL ApproveChecked on devnet), watch the agent's first $10 buy of a stand-in stock token, then Test the cap; the token program refuses the over-cap transfer, with a transaction link. On Home, Clock in (a devnet memo) to read the brief and earn dSKR. Safety > Stop all trading revokes the permission on-chain. Everything is Solana devnet with test tokens: the stock tokens are devnet stand-ins priced from Jupiter's live mainnet quotes. If devnet's faucet is busy, the app says so and offers a retry.
```

## Links and contact (the publisher fills these in)

| Field | Value |
|---|---|
| Website | https://xorr.finance (live; this is the hosted xorr, not this devnet build. Decide whether that is the right page to link) |
| Privacy policy URL | none yet: https://xorr.finance/privacy returns 404. Host `PRIVACY.md` (after review), or use the GitHub URL of `clockin/store/PRIVACY.md` as a stopgap |
| Terms / EULA URL | none yet (https://xorr.finance/terms returns 404). The app has in-app Terms (`/legal/terms`) |
| Support email | `<SUPPORT_EMAIL>` |
| Publisher name | `<PUBLISHER_LEGAL_NAME>`, exactly as on the KYC/KYB |
