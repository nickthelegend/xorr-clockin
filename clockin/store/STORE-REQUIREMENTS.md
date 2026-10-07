# Solana dApp Store: current requirements (checked Oct 7, 2026)

These were read from Solana Mobile's official docs and legal pages on 2026-10-07.

- **[verified]** means an official page says it, or a Publisher Portal screenshot embedded in the docs shows it.
- **[unverified]** means the docs don't cover it, or they disagree with the portal screenshots. Check it in the portal, which is behind a login and has not been seen for this kit.

## Sources

| # | Page | URL |
|---|---|---|
| S1 | Submit a New App | https://docs.solanamobile.com/dapp-store/submit-new-app |
| S2 | dApp Listing Page Guidelines | https://docs.solanamobile.com/dapp-store/listing-page-guidelines |
| S3 | Submit an Update | https://docs.solanamobile.com/dapp-store/submit-an-update |
| S4 | dApp Publishing CLI | https://docs.solanamobile.com/dapp-store/publishing-cli |
| S5 | Build and Sign an APK | https://docs.solanamobile.com/dapp-store/build-and-sign-an-apk |
| S6 | Publisher Policy (last updated Jul 21, 2026) | https://legal.solanamobile.com/publisher-policy-web |
| S7 | Developer Agreement (last updated Jun 30, 2026) | https://legal.solanamobile.com/developer-agreement-web (linked from https://docs.solanamobile.com/dapp-store/agreement) |
| S8 | Portal screenshot "Let's add your dApp details!" (in S1) | https://mintcdn.com/solanalabs/TqbmPoBvHph_ccql/images/static/publishing_portal/new-dapp-details.png |
| S9 | Portal screenshot "Update your dApp details" (in S3) | https://mintcdn.com/solanalabs/TqbmPoBvHph_ccql/images/static/publishing_portal/update-dapp-details.png |
| S10 | Portal screenshot "Upload … release" (in S1) | https://mintcdn.com/solanalabs/TqbmPoBvHph_ccql/images/static/publishing_portal/dapp-apk-upload.png |
| S11 | `npm view @solana-mobile/dapp-store-cli` | version 1.0.1, modified 2026-09-14 |
| S12 | Backed (xStocks issuer) geoblock page | https://assets.backed.fi/geoblock |
| S13 | Kraken: xStocks availability | https://support.kraken.com/gb/articles/xstocks-availability |

## Process

| Item | Requirement | Status |
|---|---|---|
| New app | Created only in the **Publisher Portal** (https://publish.solanamobile.com). The steps are: sign up, then KYC/KYB, then connect a publisher wallet, then pick storage (ArDrive is recommended), then "Add a dApp" > "New dApp" and fill in the details. Then go to Home > "New Version", upload the APK, and approve every signing prompt (Arweave upload and release NFT mint). | [verified] S1 |
| CLI | `@solana-mobile/dapp-store-cli` 1.0.1 handles **updates only**, for an app whose App NFT the portal has already minted. Usage: `dapp-store --apk-file <apk> --keypair <solana-keypair.json> --whats-new "<notes>"`. It reads `DAPP_STORE_API_KEY` (from env or stdin), and the key is created at publish.solanamobile.com/dashboard/settings/api-keys. The CLI finds the app by the APK's package name. | [verified] S4, S11 |
| `config.yaml` | The current CLI doesn't use it. The YAML flow (`create publisher/app/release`) belongs to the legacy 0.x CLI. `dapp-store/config.yaml` here keeps the listing as structured data only. | [verified] by omission in S4 |
| Publisher wallet | A browser-extension wallet. "Your publisher wallet is required for all future submissions of this app." | [verified] S1 |
| SOL | "~0.2 SOL" for transaction fees and ArDrive uploads. Use the cost estimator and "Top Up Balance" if needed. | [verified] S1 |
| Review | Within 3–5 business days, by email from `publishersupport@dappstore.solanamobile.com`. After 5 days, post in Discord `#dev-answers`. | [verified] S1, S3 |

## Listing fields and assets

| Item | Requirement | Status |
|---|---|---|
| dApp name | The portal form says "Maximum 25 characters". | [verified] S8, S9 |
| Package name | Reverse-domain. Must match the APK: `finance.xorr.app`. | [verified] S8 |
| Subtitle (short description) | "Short description cannot exceed 30 characters." | [verified] S2, S8 |
| Description | Required. "a well-written, concise overview". No length limit is documented. | [verified] S2. The limit is [unverified]. |
| Icon | 512×512, required. | [verified] S2, S8 |
| Banner | 1200×600, shown "behind the dApp icon". The new-dApp form marks it "(Required)". | [verified] S8, S9 |
| Feature graphic | Not in the current docs or the portal screenshots, so none is made. | [unverified] |
| Screenshots | Docs: "at least 1080px in width and height", consistent orientation, equal aspect ratio. Portal: "All must be 1080×2400px (Minimum 4 required)". Formats: jpg, png or webp up to 3 MB; mp4 up to 30 MB. | [verified] S2, S8, S9 |
| What's new | Required for updates and shown on the listing. The CLI's `--whats-new` is mandatory. | [verified] S3, S4 |
| Category, content rating, keywords, testing notes, privacy-URL field | None of these are documented. S1 says approved apps go live "under an appropriate category". | [unverified] |

## APK

| Item | Requirement | Status |
|---|---|---|
| Format | Docs: "The dApp Store requires an APK". The portal upload screen also accepts ".AAB". Upload the APK. | [verified] S5, S10 (they conflict) |
| Signing | A signed release build with one dedicated key per app. Use a separate key from Google Play. Losing the key means no more updates. | [verified] S5 |
| Updates | "signed with the same Android signing key you used for your initial release". `versionName` and `versionCode` must both be incremented. | [verified] S3 |
| min/target SDK, debuggable | Not documented. | [unverified]. xorr 1.2.0 targets SDK 36 with minSdk 24. |

## Policy points that matter for xorr (a trading app showing tokenized US stocks)

- **Regulated financial services.** The Publisher Policy's "Restricted Activities and Transactions" section says: "dApps that provide or purport to provide financial services subject to any regulation under Applicable Law must obtain and provide … all documentation required by Applicable Law". [verified] S6
- **Developer warranties.** The Developer Agreement, §6(viii), has the developer warrant that it "has not failed to comply with … any applicable legal requirement relating to any blockchain technologies, digital asset or token trading". §6(vi) acknowledges that the developer has "conducted an independent investigation" of those requirements. [verified] S7
- **In-app privacy policy and EULA.** Developer Agreement §2.1 requires "a link to the applicable privacy policy and EULA" to be easily accessible in each app. The Publisher Policy also requires a privacy disclosure that "complies with Applicable Law". [verified] S6, S7
- **Removal at any time.** Developer Agreement §3: Solana Mobile "may remove any Developer Application … at any time and for any or for no reason". [verified] S7
- **Third-party IP and affiliation.** The Publisher Policy prohibits "Content that infringes on intellectual property of any third-party", content that "falsely claims an affiliation with or endorsement by a third party", and content "designed to create a likelihood of confusion with a third-party's entity, brand, products or services". [verified] S6
- **Who may hold xStocks.** The issuer's geoblock page lists the United States among the jurisdictions Backed does not serve. Kraken lists xStocks as unavailable in the US, Australia, Canada and the UK. [secondary sources, S12/S13: confirm with the issuer's own terms before relying on this]. The Publisher Policy itself sets no geographic rule. [verified] S6, by omission.
