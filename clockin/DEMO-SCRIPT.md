# xorr · CLOCK IN: demo video shot list

The judges read the transcript, so narrate every shot (voiceover or captions). This is the core 90 seconds. For the
~3-minute portal cut, add the extended shots at the end. Record on an Android phone (ideally a Seeker, to show the
Seed Vault sheet) or an emulator with an MWA wallet. The iOS simulator shows the guest-wallet path.

| # | Time | Screen | Action | Narration |
|---|---|---|---|---|
| 1 | 0:00–0:08 | Start | App opens on the coin art, with the **DEVNET · TEST TOKENS** pill visible | "xorr is an AI agent that trades tokenized US stocks for you, without ever holding your money. This is the Seeker build, on Solana devnet." |
| 2 | 0:08–0:18 | Start → Seed Vault sheet | Tap **Connect wallet · Seed Vault**, then approve in the wallet | "On a Seeker the first button is Seed Vault, over Mobile Wallet Adapter. xorr's devnet faucet sets the wallet up with test dollars and SKR. No signature needed." |
| 3 | 0:18–0:30 | Today | Scroll slowly through the agent card and the brief | "Every morning the agent has a brief waiting: what the book did, what moved since I last clocked in, and what it plans to do, written from live Jupiter prices." |
| 4 | 0:30–0:42 | Agent | Choose 100 dUSDC, tap **Sign permission**, approve in the wallet | "I give it a permission: one ApproveChecked on my dUSDC. The token program enforces the cap, not xorr." |
| 5 | 0:42–0:55 | Today | Tap **Clock in · +15 dSKR**, sign, and watch the week strip light up and the "What it did just now" list appear | "I clock in with one signature. My streak goes up, I earn SKR, and the agent takes its look and buys, telling me why." |
| 6 | 0:55–1:05 | Agent | Tap **Test the cap**, then open the explorer link | "Can it overspend? It tries 150 dUSDC against my 100. The token program refuses on devnet, and here's the failed transaction." |
| 7 | 1:05–1:15 | SKR | Show the tier card, the earn table, and **Night Shift · 20 dSKR · 24h** | "SKR is what I pay my agent with. Clocking in earns it, a strategy shift spends it, and holding it sets my tier. If I already hold real SKR, my tier starts there." |
| 8 | 1:15–1:25 | Agent | Tap **Revoke** and confirm | "And one tap stops everything: an SPL Revoke on every account. The agent can move nothing." |
| 9 | 1:25–1:30 | Today | Hold on the streak strip | "Thirty seconds a day. Clock in tomorrow." |

**Extended (portal cut, to about 3:00):**
- *Look now* on the Agent tab: walk through the BUY and HOLD rows and their reasons, including a guard hold if one shows.
- The trail on the Agent tab: tap one explorer link per action type.
- The Me tab: wallet type and the morning-brief switch, which triggers the notification prompt.
- Today scrolled: the book at live prices with P&L, and the Watching list showing pool versus issuer.
- On a Seeker: the SKR tab's **Seeker verified · 1.5×** card.

Everything above was performed in the app on the iOS simulator against a local Solana validator (Oct 6). Only the MWA
and Seed Vault shots need an Android device; see HANDOFF.md.
