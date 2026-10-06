#!/usr/bin/env bash
# Build the CLOCK IN release APK (Solana devnet) and copy it to clockin/apks/xorr-clockin.apk.
#
#   tools/clockin/build-apk.sh
#
# Needs (none of them in git):
#   .env.local                      EXPO_PUBLIC_CLOCKIN_FAUCET_SECRET (written by tools/clockin/setup-devnet.ts),
#                                   EXPO_PUBLIC_PRIVY_APP_ID / _CLIENT_ID (optional: Privy sign-in)
#   $SIGNING (default ../.keys/xorr-clockin.signing.properties)
#                                   XORR_RELEASE_STORE_FILE/_STORE_PASSWORD/_KEY_ALIAS/_KEY_PASSWORD
# The cluster is forced to devnet here, whatever .env.local says for local development.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CLOCKIN="$(cd "$ROOT/.." && pwd)"
[ -f "$CLOCKIN/env.sh" ] && source "$CLOCKIN/env.sh"
mkdir -p "${TMPDIR:-/tmp}"
SIGNING="${SIGNING:-$CLOCKIN/.keys/xorr-clockin.signing.properties}"
OUT="${OUT:-$CLOCKIN/apks/xorr-clockin.apk}"
ARCHS="${ARCHS:-arm64-v8a,x86_64}"

cd "$ROOT"
# The shared stand-in set must be devnet's (or empty: then each phone creates its own set on first run).
node -e "const d=require('./src/clockin/devnet.json'); if(/127\.0\.0\.1|localhost/.test(d.cluster||'')) { console.error('src/clockin/devnet.json holds LOCALNET mints; restore the devnet set (git checkout src/clockin/devnet.json)'); process.exit(1) } console.log(d.usdc ? 'shared devnet set '+d.usdc : 'no shared set: each phone creates its own stand-in mints')"

export NODE_ENV=production
export EXPO_PUBLIC_CLOCKIN=1
export EXPO_PUBLIC_XORR_CHAIN=solana-devnet
export EXPO_PUBLIC_CLOCKIN_RPC="${EXPO_PUBLIC_CLOCKIN_RPC_RELEASE:-https://api.devnet.solana.com}"
export EXPO_PUBLIC_CHAIN_RPC="$EXPO_PUBLIC_CLOCKIN_RPC"

npx expo prebuild -p android --no-install >/dev/null
PROPS=()
if [ -f "$SIGNING" ]; then
  while IFS= read -r l; do [ -n "$l" ] && PROPS+=("-P$l"); done < "$SIGNING"
else
  echo "WARNING: no signing properties at $SIGNING — the APK will be signed with the debug key." >&2
fi
# One daemon, 3 GB heap at most (shared machine), stopped when done.
(cd android && ./gradlew assembleRelease -PreactNativeArchitectures="$ARCHS" "${PROPS[@]}" \
  -Dorg.gradle.jvmargs="-Xmx3g -XX:MaxMetaspaceSize=768m" -Dorg.gradle.workers.max=4 --console=plain; ./gradlew --stop >/dev/null)
mkdir -p "$(dirname "$OUT")"
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
"$BT/apksigner" verify --print-certs "$OUT" | grep -E "Signer #1 certificate DN|SHA-256" || true
shasum -a 256 "$OUT"
ls -lh "$OUT"
