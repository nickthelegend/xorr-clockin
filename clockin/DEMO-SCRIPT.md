# xorr · CLOCK IN: demo video shot list

The judges read the transcript, so narrate every shot (voiceover or captions). This is the core 90 seconds. For the
~3-minute portal cut, add the extended shots at the end. Record on an Android phone (ideally a Seeker, to show the
Seed Vault sheet) or an emulator with an MWA wallet. The iOS simulator shows the guest-wallet path.

| # | Time | Screen | Action | Narration |
|---|---|---|---|---|
| 1 | 0:00–0:08 | Welcome | The app opens on xorr's coin hero: "A bot that trades while you get on with your life", with the **Devnet · test tokens** tag under the legal line | "xorr is an AI agent that trades tokenized US stocks for you, without ever holding your money. This is the Seeker build, on Solana devnet." |
| 2 | 0:08–0:16 | Welcome → Seed Vault sheet | Tap **Connect wallet**, then approve in the wallet | "On a Seeker, Connect wallet is Seed Vault, over Mobile Wallet Adapter. xorr sets the wallet up with test dollars and SKR, and I don't sign anything for that." |
| 3 | 0:16–0:26 | Intro (3 screens) | Swipe through: Meet your agent → A permission you can take back → Clock in every morning | "Three screens: what the agent does, the permission I can take back, and the daily clock-in that pays SKR." |
| 4 | 0:26–0:44 | First grant | Set the cap with the stepper, tap **Sign permission**, then **Buy $10 of …** and **Test the cap** | "One signature gives it a cap. It makes its first real buy, then I ask it to overspend, and the token program refuses on chain. Every step has its transaction." |
| 5 | 0:44–0:58 | Home | Show the balance, the clock-in row and the agents. Tap **Clock in · +15 dSKR** and sign | "Every morning: one signature keeps my streak and pays SKR. The agent takes its look right after." |
| 6 | 0:58–1:08 | Home → Brief tab | The headline, the agent's notes and "What it did just now" with the fill receipt | "The brief is written from live Jupiter prices and what changed since my last visit. Here's what it bought, and why." |
| 7 | 1:08–1:16 | Messages drawer | Tap the chat button, open Momentum Scout, tap "What did you buy?" | "I can ask any of my agents. They answer from their own numbers." |
| 8 | 1:16–1:24 | Agent page (Night Shift) | Tap Night Shift on Home, then **Hire for 24h · 20 SKR** | "SKR is how I pay my agent for extra work. Night Shift buys the off-hours discount for a day." |
| 9 | 1:24–1:30 | Safety | Hold **Stop all trading**; the stop curtain confirms on chain | "And one hold stops everything: an SPL revoke. Thirty seconds a day — clock in tomorrow." |

**Extended (portal cut, to about 3:00):**
- An agent page: **Look now**, then walk through the BUY and HOLD rows and their reasons, including a guard hold if one
  shows.
- Safety → Activity: tap one transaction per action type.
- Profile (avatar or bell on Home): the morning-brief switch with its time (7:00 / 8:30 / 10:00) and the streak
  reminder, then Advanced.
- Home's Stocks tab: holdings at live prices with P&L, and the watchlist showing pool versus issuer, with issuer logos.
- The SKR screen: tier meter, earn, spend and hold. On a Seeker, the **Seeker 1.5×** tag.
- Share on the Brief tab: the streak and P&L card goes to the share sheet.

Everything above was performed in the app on the iOS simulator against a local Solana validator (Oct 7, polish build). Only the MWA
and Seed Vault shots need an Android device; see HANDOFF.md.
