/**
 * A friendly error as a note's two lines: the first sentence is the label ("Can’t reach Solana devnet right now"), the
 * rest is the detail ("Your tokens are safe on chain — try again in a moment.").
 */
export function splitNote(message: string): { label: string; detail: string } {
  const text = message.trim();
  const m = /^(.+?[.!?])\s+(.+)$/s.exec(text);
  if (!m) return { label: text.replace(/\.$/, ''), detail: '' };
  return { label: m[1]!.replace(/\.$/, ''), detail: m[2]! };
}
