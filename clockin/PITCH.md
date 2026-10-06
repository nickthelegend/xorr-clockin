# xorr · CLOCK IN: pitch outline (9 slides)

Each slide has a title, its on-slide content and speaker notes. Judges read the slides themselves, so the content goes on them.

---

## 1. xorr: an AI stock agent you clock in with every morning

**On slide:** the XORR wordmark, a phone showing Today (the agent's face, the morning brief, the gold *Clock in* button),
and the tagline "Tokenized US stocks on Solana, traded inside a permission you can revoke in one tap."

**Notes:** xorr is an AI agent that trades tokenized US stocks for you on Solana and never holds your money. On Seeker it
becomes a 30-second morning habit: read the brief, clock in, let the agent work.

## 2. The problem: trading bots are a trust problem

**On slide:** "Robo-advisors take custody. Crypto bots take your keys. Tokenized stocks trade 24/7, and nobody can watch
all night."

**Notes:** People want automation, but every option asks them to hand over money or keys. The 24/7 xStock market makes
it worse: the share is shut for 17.5 hours a day, while the token keeps moving.

## 3. The answer: the permission is the product

**On slide:** a diagram: your wallet signs SPL `ApproveChecked`, the agent key becomes a delegate capped at N, and the
token program enforces the cap. One tap signs `Revoke`.

**Notes:** The agent is an SPL delegate. The token program, not xorr, stops it at what you approved. In the app, *Test the
cap* has the agent try to overspend, and devnet refuses it on screen with an explorer link. *Revoke* ends everything.

## 4. Why you open it every day

**On slide:** the Today screen: the brief ("Your agent's book is up $0.09… Since your last clock-in: MSFTx +0.74%…"), a
7-day streak strip, "+23 dSKR tomorrow" and the 8:30 notification.

**Notes:** The brief is written from that morning's prices and from what changed since your last clock-in. Clocking in is
one Seed Vault signature: an on-chain memo that keeps your streak and pays SKR. The agent takes its look right after, so
the check-in is also when things happen.

## 5. SKR: earn it, spend it, hold it

**On slide:** three columns.
- **Earn:** 10 SKR per clock-in, +5 per streak day, × tier, × 1.5 for Seeker.
- **Spend:** hire *Night Shift* (20 SKR) or *Dip Buyer* (10 SKR) for 24 hours.
- **Hold:** Bronze 100 / Silver 500 / Gold 2,000 SKR unlock strategies, cut the fee from 0.30% to 0% and multiply
  rewards.

**Notes:** SKR is how you pay your agent for extra work, not a badge. There is no staking. Real SKR you already hold on
mainnet counts toward your tier from day one; the app reads it and never moves it. On devnet the loop runs on a
stand-in mint, labelled everywhere.

## 6. Seeker-native

**On slide:** "Connect wallet · Seed Vault" as the first button, a Seed Vault signing sheet, and a "Seeker verified ·
1.5×" badge.

**Notes:** Mobile Wallet Adapter 2.3 is the primary path. Each signature caches its auth token, so later ones need no
reconnect. A Seeker Genesis Token in the wallet, read from mainnet, multiplies every reward. Haptics on every commit,
local notifications for the brief and for each agent trade.

## 7. The agent, honestly

**On slide:** the Agent tab's "Look now" list: BUY / HOLD per stock, each with its reason ("Guard: the pool is +1.8% from
the issuer's mark…").

**Notes:** The agent's decisions are rules you can read: exits first, then a guard comparing the Solana pool with the
issuer's own mark for the share, then the strategies your tier and shifts allow, paced to one entry per stock per day.
Every decision comes with its reason. Optionally, your own OpenRouter key lets a model narrate the brief and answer
questions. It explains decisions; it doesn't make them.

## 8. Built and proven

**On slide:** "STOCKLANA: live on Solana mainnet with Jupiter-routed xStock fills · CLOCK IN: new Seeker app, MWA, devnet
loop, SKR economy · 9/9 on-chain tests: grant → buy → cap refused → sell → revoke → refused."

**Notes:** xorr already runs on mainnet with real fills (STOCKLANA). For CLOCK IN we built the mobile layer: the
Seeker-first wallet, the daily loop, SKR, and an on-device agent that works against devnet with no server. The test
suite runs the whole permission loop on chain.

## 9. Ask and next steps

**On slide:** "Next: the dApp Store listing; the CLOCK IN loop on the mainnet agent, so SKR pays for real shifts; streak
leagues between Seekers. Try it: the APK link and the GitHub link."

**Notes:** If xorr wins, it ships to the dApp Store, the daily loop moves onto the mainnet agent, and SKR becomes the
currency the agent is paid in.
