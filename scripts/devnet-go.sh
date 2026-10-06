#!/usr/bin/env bash
# One command after funding xorr's devnet faucet: create the shared devnet stand-in set, run the whole loop on devnet,
# record the signatures, and rebuild the release APK.
#
#   scripts/devnet-go.sh            # does everything except git push
#   scripts/devnet-go.sh --push     # also commits src/clockin/devnet.json + clockin/DEVNET-RUN.md and pushes
#
# Fund first: send >= 0.1 devnet SOL (1 is comfortable) to the faucet address printed below.
# Devnet only. Nothing here touches mainnet or any hosted service.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLOCKIN="$(cd "$ROOT/.." && pwd)"
[ -f "$CLOCKIN/env.sh" ] && source "$CLOCKIN/env.sh"
mkdir -p "${TMPDIR:-/tmp}"
cd "$ROOT"
KEY="${CLOCKIN_FAUCET_KEYPAIR:-$HOME/.config/solana/xorr-clockin/faucet.json}"
RPC="${CLOCKIN_RPC:-https://api.devnet.solana.com}"
case "$RPC" in *mainnet*) echo "refusing: $RPC is not devnet" >&2; exit 1;; esac

# 1. The faucet's balance.
ADDR="$(solana address -k "$KEY")"
BAL="$(solana balance "$ADDR" --url "$RPC" | awk '{print $1}')"
echo "faucet  $ADDR"
echo "balance $BAL SOL on $RPC"
if ! awk "BEGIN{exit !($BAL >= 0.05)}"; then
  echo "Fund it first: send >= 0.1 devnet SOL to $ADDR (e.g. https://faucet.solana.com), then re-run." >&2
  exit 2
fi

# 2. The shared devnet set (idempotent; refuses mainnet). Writes src/clockin/devnet.json and .env.local (faucet secret).
CLOCKIN_RPC="$RPC" CLOCKIN_FAUCET_KEYPAIR="$KEY" npx tsx tools/clockin/setup-devnet.ts

# 3. The whole loop on devnet, every signature recorded.
set -a; . ./.env.local; set +a
OUT="clockin/DEVNET-RUN.md"
LOG="$(mktemp)"
CLOCKIN_LIVE=1 EXPO_PUBLIC_CLOCKIN_RPC="$RPC" npx vitest run src/clockin/chain.devnet.test.ts --reporter=verbose 2>&1 | tee "$LOG"
grep -q "Tests .*passed" "$LOG" || { echo "the devnet loop failed; see above" >&2; exit 3; }
{
  echo "# The CLOCK IN loop on Solana devnet"
  echo
  echo "Run $(date -u +%Y-%m-%dT%H:%MZ) by \`scripts/devnet-go.sh\` (\`src/clockin/chain.devnet.test.ts\`). Explorer links:"
  echo
  grep -E "^(fund|starter dSKR|check-in|shift|grant|agent buy|over-cap \(refused\)|agent sell|revoke|buy after revoke) " "$LOG" \
    | awk '{sig=$NF; $NF=""; sub(/ +$/, ""); printf "- %s: [%s](https://explorer.solana.com/tx/%s?cluster=devnet)\n", $0, sig, sig}'
  echo
  echo "Mints: see \`src/clockin/devnet.json\`."
} > "$OUT"
cat "$OUT"

# 4. The release APK, against the shared devnet set.
tools/clockin/build-apk.sh

if [ "${1:-}" = "--push" ]; then
  git add src/clockin/devnet.json "$OUT"
  git commit -m "Devnet stand-in mints and the loop's devnet signatures"
  git push origin main
else
  echo
  echo "Next: git add src/clockin/devnet.json $OUT && git commit -m 'Devnet stand-in mints' && git push"
  echo "Then update clockin/SUBMISSION.md (mints, signatures, new APK sha256 above)."
fi
