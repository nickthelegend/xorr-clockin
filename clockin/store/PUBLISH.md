# Publishing xorr to the Solana dApp Store: checklist

CLOCK IN winners must publish within 30 days of the results (Nov 10, 2026), so by about **Dec 10**. Review takes 3–5
business days, so submit by about **Dec 1**. The rules and their sources are in `STORE-REQUIREMENTS.md`.

The account, KYC, wallet, money and legal steps are yours to do. No agent may do them.

## 0. Decide and fix before building the store APK

These touch app code, which belongs to the app's builder:

- [ ] **Financial-app compliance (the biggest item).** xorr presents an agent that trades tokenized US stocks. The Publisher Policy requires a dApp that provides "financial services subject to any regulation under Applicable Law" to carry the documentation that law requires. In the Developer Agreement (§6(viii)) you warrant compliance with token-trading laws. This build trades only devnet stand-ins, which helps, but the presentation is still a stock-trading bot. Decide, with advice for your jurisdiction, how to frame it. One option is "simulation / paper trading on devnet". Add the disclaimers it needs. See `README.md`.
- [ ] **Issuer logos and tickers.** The Stocks tab shows company logos (Apple, Tesla, NVIDIA, Microsoft and others), served from Backed's metadata host. Decide whether to keep them. See the IP section of `README.md`.
- [ ] **Link the risk disclosure.** `/legal/risk` (which covers the US-person restriction and the fact that you can lose money) isn't linked from any CLOCK IN screen. Only Terms and Privacy are linked.
- [ ] **Make the in-app Privacy page match `PRIVACY.md`.** See the last section of that file. Developer Agreement §2.1 requires the privacy policy and EULA to be linked in the app.
- [ ] **Disconnect should wipe keys** (guest, agent and venue keys, the OpenRouter key, the Privy session), or the privacy text must keep saying it doesn't.
- [ ] **The devnet faucet secret is inside the APK** (`EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET`). It holds devnet funds only, and HANDOFF.md says so. Anyone can still extract it, and a reviewer who unpacks the APK will find a private key. Consider leaving it out of the store build and relying on the per-phone fallback.
- [ ] **Bump the version.** The hackathon APK is **1.2.1 / versionCode 4**. The store build needs **versionCode 5 or higher** and a higher `version` (for example 1.2.2), set in `app.json` (`expo.version`, `expo.android.versionCode`, and `ios.buildNumber` for parity).
- [ ] Icon recommendations for the builder are in `README.md` (monochrome icon, notification icon).

## 1. Build and sign

Use **xorr's existing release key**. Never create a new one: the dApp Store only accepts updates signed with the key
of the first release, and the judges' installs already use this key.

| | |
|---|---|
| Keystore | `/Volumes/Extreme SSD/Projects/clockin/.keys/xorr-clockin-release.keystore` |
| Passwords and alias | `/Volumes/Extreme SSD/Projects/clockin/.keys/xorr-clockin.signing.properties` (`XORR_RELEASE_STORE_FILE`, `_STORE_PASSWORD`, `_KEY_ALIAS`, `_KEY_PASSWORD`) |
| Certificate | `CN=xorr CLOCK IN, O=xorr, C=IN`, SHA-256 `854facad063895137afeea0bde4fb9f9974c9d6d5920e0e0afb70ac3309fb02e` |
| Never | commit either file, paste the passwords anywhere, or upload a debug-signed APK |

- [ ] **Back up both files now**, to two offline places. If they are lost, xorr can never be updated on the store.

```bash
source "/Volumes/Extreme SSD/Projects/clockin/env.sh"
cd "/Volumes/Extreme SSD/Projects/clockin/xorr-clockin"
tools/clockin/build-apk.sh      # forces devnet, takes the shared .gradle.lock, signs from the properties above,
                                # writes /Volumes/Extreme SSD/Projects/clockin/apks/xorr-clockin.apk
```
Check the result before uploading:
```bash
BT=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
A="/Volumes/Extreme SSD/Projects/clockin/apks/xorr-clockin.apk"
"$BT/apksigner" verify --print-certs "$A" | head -2   # CN=xorr CLOCK IN and the SHA-256 above
"$BT/aapt2" dump badging "$A" | head -1                # finance.xorr.app, versionCode >= 5
shasum -a 256 "$A"
```
If the build prints "no signing properties … debug key", **do not upload** that APK.

## 2. Publisher account (once)

- [ ] Sign up at https://publish.solanamobile.com, fill in the publisher profile, and complete **KYC/KYB** under the identity you will publish as.
- [ ] Create a **dedicated publisher wallet** in a browser extension (Phantom, Solflare or Backpack). **Keep it forever**, because every later xorr release must come from it. Back up its recovery phrase offline. Don't reuse the hosted xorr's mainnet operational keys.
- [ ] Fund it with about **0.2 SOL on mainnet**. That's real money: fees plus ArDrive storage for about 81 MB of APK and about 2 MB of images. Use the cost estimator, and **Top Up Balance** if needed.
- [ ] Choose **ArDrive** as the storage provider.

## 3. Add the dApp ("Add a dApp" > "New dApp")

| Portal field | Value / file |
|---|---|
| dApp Name (max 25) | `xorr` |
| Package Name | `finance.xorr.app` |
| Subtitle (max 30) | `An agent for tokenized stocks` |
| Description | the long description in `LISTING.md` |
| dApp Icon 512×512 | `clockin/store/icon-512.png` |
| Banner 1200×600 | `clockin/store/banner-1200x600.png` |
| dApp Preview (1080×2400, at least 4, at most 3 MB each) | `clockin/store/screenshots/01-welcome.png` … `06-stop-trading.png`, in that order |
| Other fields, if the form asks | category **Finance**; website; privacy URL; support email; testing notes. All are in `LISTING.md` |

## 4. First release

- [ ] Go to the app's Home > **New Version** and upload the APK from step 1. Fill in "What's new" from `LISTING.md`.
- [ ] Press **Submit** and **approve every signing request** without skipping any.
- [ ] Wait 3–5 business days for an email from `publishersupport@dappstore.solanamobile.com`. After 5 days, ask in `#dev-answers` on https://discord.gg/solanamobile.
- [ ] After approval, record the App and Release NFT addresses, the versionCode and the APK sha256 in HANDOFF.md.

## 5. Updates

```bash
npm i -g @solana-mobile/dapp-store-cli      # 1.0.1 (Oct 2026), updates only
export DAPP_STORE_API_KEY=…                  # created at publish.solanamobile.com/dashboard/settings/api-keys
dapp-store --apk-file "/Volumes/Extreme SSD/Projects/clockin/apks/xorr-clockin.apk" \
  --keypair /path/OUTSIDE/the/repo/signer.json --whats-new "…"
```
- Bump `versionCode` and `version` on every update, and sign with the same keystore.
- `--keypair` is a Solana CLI keypair file. The docs don't say whether it must be the publisher wallet ([unverified]). Check in the portal before exporting a browser-wallet key to a file. Keep any such file out of the repo and out of synced folders.
- Without the CLI: in the portal, use Details to change the listing, then **New Version**. Choose "use existing APK" when only the listing changed.
