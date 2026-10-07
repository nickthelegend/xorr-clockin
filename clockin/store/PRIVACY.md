# xorr privacy policy: CLOCK IN / Seeker build (DRAFT)

> **This is a draft for the publisher.** Before relying on it:
> - Fill in every `<…>`.
> - Have it reviewed for your jurisdiction.
> - Host it at a public URL. https://xorr.finance/privacy returns 404 today.
> - Make the in-app Privacy page say the same thing (see "In-app policy" at the end).
>
> It describes the Android build `finance.xorr.app` 1.2.0, built with `tools/clockin/build-apk.sh`
> (`EXPO_PUBLIC_CLOCKIN=1`, Solana devnet), and was written from that code at commit 96818b9 and re-checked against 83fc2a0. It does **not** cover the
> hosted xorr web app at xorr.finance, which has a server.
> Items marked ⚠ are behaviours the publisher may want to change before release. They are not promises.

**Effective date:** `<DATE>` · **Publisher:** `<PUBLISHER_LEGAL_NAME>` ("we") · **Contact:** `<SUPPORT_EMAIL>`

## Summary

- This build of xorr runs **without an xorr server**. We do not receive your trades, balances or messages.
- It runs on **Solana devnet** with **test tokens**. The stock tokens are devnet stand-ins, priced from live mainnet quotes.
- Your keys are generated and kept **on your phone**, in the Android Keystore.
- **No analytics, advertising, tracking or crash reporting.**
- Some services do see some data: Solana RPC providers, Jupiter (price lookups), Privy (only if you sign in with email), OpenRouter (only if you add your own key), and image CDNs. Each is described below.
- Transactions you sign are recorded **publicly and permanently** on the blockchain.

## What stays on your phone

| Data | Where | Purpose |
|---|---|---|
| Guest wallet key (if you choose the guest wallet), your agent's key (an SPL delegate), and this phone's devnet "venue" key | SecureStore (Android Keystore) | Signing devnet transactions on the phone. These secret keys are never sent anywhere |
| Your OpenRouter API key, if you add one | SecureStore | Calling the model you chose (see below) |
| Session: wallet type and address, Mobile Wallet Adapter authorization token, streak, activity trail (up to 200 entries, with transaction signatures), holdings ledger and cost basis, last prices, last brief, reminder time and on/off, SKR passes, chosen AI model, the devnet token set this phone created, whether you've seen the intro | App storage (AsyncStorage) | Running the app and showing your history |

Android backup is turned off for this app (`allowBackup: false`), so this data is not copied to cloud backups.

## What leaves your phone, and to whom

1. **Solana devnet RPC** (by default `api.devnet.solana.com`).
   - What it receives: your public wallet address and your agent's public key (to read balances), the transactions you or your agent sign, and requests for devnet SOL.
   - What becomes public on devnet: clock-in memos (date, streak, reward), the permission you grant (the agent key and the cap), and trades.
2. **Solana mainnet RPC** (`api.mainnet-beta.solana.com`). Read only. Your public wallet address is used to read your real **SKR** balance and to check for a **Seeker Genesis Token**. Nothing is signed or sent on mainnet.
3. **Jupiter price API** (`lite-api.jup.ag` / `api.jup.ag`). Fetches live prices for a fixed list of token addresses. No address or other personal data of yours is sent.
4. **Privy** (privy.io), **only if you choose "Sign in" with email**. Privy receives your email address and the one-time code, and creates and secures an embedded Solana wallet for you. It also sees your IP address and device details. Privy's own privacy policy applies. The app itself stores only that wallet's public address.
5. **OpenRouter** (openrouter.ai), **only if you add your own OpenRouter API key** in Profile → Advanced. When you use "Ask your agent", the app sends:
   - your question (up to 500 characters)
   - your agent's latest brief and decisions
   - prices
   - your holdings (quantity and cost)
   - your dUSDC cash balance, tier and streak
   - your recent trades

   It is sent to OpenRouter and the model provider you selected (the default is `anthropic/claude-haiku-4.5`), under their policies. Your wallet address is not included. The key is used only for this. "Remove" deletes it from the phone.
6. **Image hosts** (`xstocks-metadata.backed.fi`, `r2.solanamobiledappstore.com`, `raw.githubusercontent.com`) serve token logos. Like any web request, they see your IP address and user agent.
7. **Your wallet app** (Seed Vault, Phantom, Solflare and others), through Mobile Wallet Adapter. It sees xorr's name, website and icon, and the transactions you approve. Its own policy applies.
8. **Solana Explorer** opens in your browser only when you tap "View transaction".

RPC, API and CDN operators can see your IP address and the requests your phone makes.

## Notifications

The morning brief, the evening streak reminder and trade alerts are **local notifications**, scheduled on the phone. The app asks for permission only when you turn reminders on in Profile. It does not register for push notifications or send a push token anywhere.

## Permissions

- **Internet and network state**: reaching Solana and price data.
- **Notifications, boot completed, wake lock, vibrate**: local reminders that survive a restart.
- **Biometric/fingerprint**: declared by a security library. This build does not prompt for it.
- **Launcher badges and install-referrer**: added by libraries. Not used for tracking.

xorr does **not** use the camera, microphone, location, contacts, photos or files.

## No analytics, ads or tracking

This build contains no analytics, advertising, attribution or crash-reporting SDK, and uses no cookies.

## Children

xorr is intended for adults (`<Publisher: confirm the minimum age, e.g. 18+; the app has no age gate today>`). It is not directed at children, and we do not knowingly collect information from them.

## Where xorr may be used

xorr shows tokenized US stocks. Real tokenized stocks (such as xStocks) are not offered to US persons or residents of some other jurisdictions. This build uses only devnet stand-ins and test tokens, and it is not an offer of any security. `<Publisher: state your own availability and eligibility terms here.>`

## Your choices

- **Disconnect** (Profile), after a confirmation that lists what it deletes, deletes the guest wallet, agent and venue keys and your OpenRouter key from the keystore, signs you out of Privy, ends the wallet app's Mobile Wallet Adapter session, and clears the app's session data on this phone.
- **Remove** (Profile → Advanced) deletes your OpenRouter key.
- **Uninstalling, or clearing the app's storage**, deletes everything the app keeps on the phone.
- On-chain transactions cannot be erased by anyone.
- If you used Privy, contact Privy to delete that account.
- For questions or requests under GDPR, UK GDPR, CCPA or similar laws, write to `<SUPPORT_EMAIL>`.

## Changes

If a future version adds a server, analytics, push notifications or new third parties, we will update this policy first and change the effective date.

---

### In-app policy (note to the publisher: delete this section before publishing)

The app's own Privacy page (`src/legal/documents.ts`) was written for the hosted xorr, and it disagrees with this build in several places:

- It says "we store" positions and allowlists on a server.
- It says a push token is stored.
- It says trades are routed through 1inch.
- It says the language model does not receive balances. In this build it does receive holdings, costs and cash.
- It doesn't mention the mainnet read, the image hosts, or what the public memos record.

Since 640ca65 the page opens with a CLOCK IN note ("This devnet build runs no xorr server… Where the text below describes the hosted xorr… it does not apply here"). That note helps, but the text under it still says the model never receives balances, which is wrong for this build, and it leaves out the mainnet read, Privy's role, OpenRouter and the image hosts. The Developer Agreement (§2.1) requires an in-app link to a privacy policy, so either link this policy from the app or bring the in-app text in line with it before you submit. That file belongs to the app's builder, not this kit.
