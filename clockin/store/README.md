# xorr: dApp Store publishing kit

Everything needed to list xorr (`finance.xorr.app`) on the Solana dApp Store.

**Scope.** This kit adds `clockin/store/` and `dapp-store/` and nothing else. The app code, `app.json` and the icons belong to the app's builder, so the icon notes below are recommendations, not changes.

| File | What it is |
|---|---|
| `STORE-REQUIREMENTS.md` | The current store rules, each with its official source. Unverified items are flagged. It includes the financial and IP policy text that applies to xorr. |
| `LISTING.md` | Name (4 characters), subtitle (29), long description, 1.2.0 release notes, category, keywords, reviewer testing notes. |
| `PRIVACY.md` | Draft privacy policy for this build, written from the code. Fill in the placeholders, then host it. |
| `PUBLISH.md` | Checklist: decisions before the build, the keystore, KYC, wallet, every portal field, CLI updates. |
| `../../dapp-store/config.yaml` | The same listing as structured data. |

## Assets

| File | Size | Caption / use |
|---|---|---|
| `icon-512.png` | 512×512 | Portal "dApp Icon". The app's own mark, `assets/brand/xorr-app-icon.png` (1254 px, the source of `assets/icon.png`), downscaled. |
| `banner-1200x600.png` | 1200×600 | Portal "Banner": wordmark, tagline, "Built for Seeker · Devnet", and the Home screen. The bottom-left, where the store draws the icon, is left empty. |
| `screenshots/01-welcome.png` | 1080×2400 | "Hire an agent. Keep your wallet." |
| `screenshots/02-clock-in-brief.png` | 1080×2400 | "One tap. One morning brief." |
| `screenshots/03-cap-held.png` | 1080×2400 | "The chain holds the line." (an over-cap transfer refused) |
| `screenshots/04-ask-agent.png` | 1080×2400 | "Ask what it bought, and why." |
| `screenshots/05-skr.png` | 1080×2400 | "Show up, level up." (dSKR tiers) |
| `screenshots/06-stop-trading.png` | 1080×2400 | "Stop everything in one tap." |

- **Formats.** All six screenshots are PNG, 190–620 KB each (the cap is 3 MB), the same size and portrait.
- **Style.** They use xorr's xlayer look: a black ground, the README banner's grid, Inter, white type, and the green dot of the `XORR.` mark (#12D77D) as the only accent.
- **Re-render.** Run `bash clockin/store/src/render.sh` (headless Chrome and Pillow, about 20 s). Captions are in `src/shot.html`.

### Which screenshots were used

The builder's newest set, **`clockin/screens/all/`**, captured Oct 7 at 17:26 on the iPhone simulator with the xlayer UI and 1.2.0 polish. It is committed on `main` since e8a552c.

| Slide | File in `all/` |
|---|---|
| 1 | `01-welcome` |
| 2 | `18-home-clocked-in-brief` |
| 3 | `15-safety-cap-refused` |
| 4 | `23-conversation-what-did-you-buy` |
| 5 | `28-skr` |
| 6 | `34-stop-curtain-stopped` |

- The templates read them straight from `clockin/screens/all/`. Each 736×1600 capture is shown at its own size, not upscaled, and is otherwise unedited.
- They are **iOS simulator captures**, because there is no Android device. They show a guest wallet on devnet.
- They were chosen so that **no screenshot shows a company logo** (see below).

## Icon review (recommendations for the builder; nothing was changed)

- **`assets/icon.png`** (1024, from 1254 px): clean and sharp. It is a white `X` with the green dot on black, with no baked-in rounding, so it works as the 512 store icon unchanged. Quality is fine.
- **Adaptive icon.** `assets/adaptive-icon.png` is an opaque RGB square, with black behind the mark, on a `#000000` background. It renders correctly, but it has no transparency and no `monochromeImage`, so Android 13+ themed icons fall back to the full-colour icon. Recommendation: a transparent foreground with the `X` alone inside the 66% safe zone, plus a white-on-transparent `monochromeImage`.
- **Notification small icon.** None is configured: `expo-notifications` is not in the `app.json` plugins, and the APK manifest has no `default_notification_icon`. Android then uses the launcher icon, which is opaque, so in the status bar it usually shows as a solid white square. This has not been seen on a device. Recommendation: `["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#12D77D" }]`, with a 96 px white `X` on transparency.
- **Splash.** `assets/splash.png` is 858×209, drawn at 180 dp wide (about 630 px on xxxhdpi), so it is sharp enough.

## Compliance and IP flags. Read these before submitting.

I'm not a lawyer, and nothing here is legal advice. The policy quotes come from `STORE-REQUIREMENTS.md`.

### 1. It is a trading app for tokenized stocks

- **The Publisher Policy.** Under "Restricted Activities and Transactions", a dApp that provides "financial services subject to any regulation under Applicable Law must obtain and provide … all documentation required by Applicable Law".
- **The Developer Agreement.** In §6(viii) the publisher warrants compliance with laws on "digital asset or token trading". Under §3, Solana Mobile may remove an app "for any or for no reason".
- **Why xorr is exposed.** It describes itself as an AI agent that buys and sells tokenized US stocks on the user's behalf. Real xStocks are securities-like tokens that the issuer does not offer to US persons. Its geoblock page lists the US; Kraken lists the US, Australia, Canada and the UK as unavailable (secondary sources, cited in `STORE-REQUIREMENTS.md`).
- **What lowers the risk in this build.**
  - Only devnet stand-ins and test tokens move.
  - It does not hold custody: funds stay in the user's wallet, and the agent is a capped SPL delegate.
  - Nothing reaches a real venue.
  - The listing copy says all of this.
- **What still needs a decision.**
  - How to frame the app for review: for example, "paper trading on Solana devnet".
  - Whether to add an in-app age and eligibility statement. There is no age or geography gate today.
  - Linking `/legal/risk`, which exists but isn't reachable from the CLOCK IN screens.
  - Whether a reviewer would treat a store listing as an offer of a regulated service in any jurisdiction.
  - **A mainnet version would be a different and much larger compliance question.**

### 2. Third-party logos and marks

The Publisher Policy prohibits "Content that infringes on intellectual property of any third-party", content that "falsely claims an affiliation with or endorsement by a third party", and content "designed to create a likelihood of confusion with a third-party's entity, brand, products or services".

**In the app (Stocks tab and token rows):**

- **Company logos on stock tokens.** NVIDIA, Tesla, Apple, Microsoft and SPY logos, loaded from Backed's metadata host (`xstocks-metadata.backed.fi`), plus company names ("NVIDIA", "Tesla", "Apple").
  - These are the companies' trademarks, as used by Backed for its real xStocks.
  - In this build they decorate **devnet stand-in tokens that neither Backed nor the companies issued**. That is the strongest "likelihood of confusion" risk in the app.
  - Ticker text alone (NVDAx) is much lower risk than the logos.
- **USDC logo on dUSDC.** The real USDC logo (Circle's mark), from the Solana token list, is shown on **dUSDC**, a devnet stand-in. Same concern.
- **SKR logo.** Solana Mobile's mark, on both dSKR and real SKR. Low risk on Solana Mobile's own store, but dSKR is a stand-in.
- **"xStocks" and "Backed".** These names appear in the brief and the risk text. They describe the real product, which is fine, but avoid any wording that suggests xorr is affiliated with Backed or endorsed by it.

**In the store art:**

- **No company logos appear in any store image.** I left out the Stocks tab (`all/20-home-stocks-holdings`, `08-stocks`) for that reason.
- **Tickers appear as text** in slides 2 and 4 and the banner (NVDAx, TSLAx, MSFTx).
- **Slide 1** is the app's welcome art: a coin with the **Solana logo** and a **Bitcoin "₿"** coin. The Solana mark is used widely in the ecosystem, and ₿ is a currency symbol rather than a company's logo, but say so in review if asked.
- **Slide 5** shows the SKR logo.

**Recommendation:** in the store build, replace the issuer and USDC logos on stand-in tokens with neutral ticker badges, or label them clearly as stand-ins. Keep real logos for a future build that holds real xStocks, under Backed's brand terms.

### 3. Other review risks

- **A private key ships in the APK.** The devnet faucet key (`EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET`) is devnet only and documented in HANDOFF.md, but a reviewer who unpacks the APK will find a private key. Consider leaving it out of the store build.
- **The in-app Privacy text was written for the hosted xorr.** It disagrees with this build (see the end of `PRIVACY.md`). Developer Agreement §2.1 requires an in-app link to a privacy policy that is accurate.
- **The model only answers questions.** README and Profile copy say a model writes the morning brief, but in this build it only answers "Ask your agent", and only with the user's own OpenRouter key. The listing copy follows the code.
- **"Disconnect" leaves keys on the phone.** Fixed in 1.2.1: after a confirmation, Disconnect deletes the agent, guest, venue and OpenRouter keys from SecureStore, signs out of Privy and deauthorizes the MWA session (`src/clockin/forget.ts`, with a test).

## Known gaps

- The screenshots come from the iOS simulator, because there is no Android device. Recapture on a Seeker from the store build if possible.
- Nobody has seen the parts of the portal form beyond what the official screenshots show. See the [unverified] rows in `STORE-REQUIREMENTS.md`.
