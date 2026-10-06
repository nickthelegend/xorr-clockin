/**
 * Optional AI narration for the agent — the owner's OWN OpenRouter key, kept in the device keystore, never shipped in
 * the APK. Without a key the agent still decides and explains every trade itself (`engine.ts`); with one, a model
 * rewrites the morning brief in a voice and answers questions about the book. The numbers it is given are the
 * engine's, so it narrates decisions — it never makes them.
 */
import { deleteSecret, getSecret, setSecret } from './secret';
import type { Brief, Decision, Quote, Holding } from './engine';

const KEY = 'xorr.clockin.openrouter';

export const getAiKey = () => getSecret(KEY);
export const setAiKey = (k: string) => setSecret(KEY, k.trim());
export const clearAiKey = () => deleteSecret(KEY);

export type AiContext = { brief: Brief; decisions: Decision[]; quotes: Record<string, Quote>; holdings: Record<string, Holding>; cashUsd: number; tier: string; streak: number };

function context(c: AiContext): string {
  return JSON.stringify({
    brief: c.brief,
    decisions: c.decisions.map((d) => ({ symbol: d.symbol, action: d.action, usd: d.usd, strategy: d.strategy, reason: d.reason })),
    prices: Object.values(c.quotes).map((q) => ({ symbol: q.symbol, usd: +q.usd.toFixed(2), change24h: q.change24h, issuerMark: q.mark })),
    holdings: Object.values(c.holdings),
    cashUsd: c.cashUsd,
    tier: c.tier,
    streak: c.streak,
    network: 'Solana devnet, stand-in tokens priced at live mainnet xStock prices',
  });
}

async function chat(model: string, system: string, user: string): Promise<string> {
  const key = await getAiKey();
  if (!key) throw new Error('Add your OpenRouter key on the Me tab to talk to the agent in words.');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'xorr CLOCK IN' },
    body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`The model answered ${res.status}.`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('The model returned nothing.');
  return text;
}

const VOICE =
  "You are xorr, a careful trading agent that buys tokenized US stocks (xStocks) for its owner inside an on-chain SPL permission they can revoke. You speak in short, plain sentences, never hype, never invent a number: use only the JSON you are given. Mention that this is devnet test money only if asked.";

export async function narrateBrief(model: string, c: AiContext): Promise<string[]> {
  const text = await chat(model, VOICE, `Write this morning's brief for the owner in at most 4 short lines, one per line, no bullets. Data: ${context(c)}`);
  return text.split('\n').map((l) => l.replace(/^[-•*\d.\s]+/, '').trim()).filter(Boolean).slice(0, 5);
}

/**
 * The agent answering from its own numbers, with no model: a stock named in the question gets its decision, reason,
 * price and position; otherwise the plan and the book. Used when the owner has not added a key.
 */
export function localAnswer(question: string, c: AiContext): string {
  const q = question.toLowerCase();
  const sym = Object.keys(c.quotes).find((s) => q.includes(s.toLowerCase()) || q.includes(s.toLowerCase().replace(/x$/, '')));
  if (sym) {
    const d = c.decisions.find((x) => x.symbol === sym);
    const quote = c.quotes[sym]!;
    const h = c.holdings[sym];
    const parts = [
      `${sym} is $${quote.usd.toFixed(2)}${quote.change24h != null ? ` (${quote.change24h >= 0 ? '+' : ''}${quote.change24h.toFixed(2)}% today)` : ''}.`,
      h ? `I hold ${h.qty.toFixed(4)} that cost $${h.cost.toFixed(2)}, worth $${(h.qty * quote.usd).toFixed(2)} now.` : 'I hold none.',
      d ? `Right now I would ${d.action === 'hold' ? 'hold' : d.action === 'buy' ? `buy $${d.usd?.toFixed(0)}` : 'sell'}: ${d.reason}` : '',
    ];
    return parts.filter(Boolean).join(' ');
  }
  if (/plan|today|what.*(do|doing)|why/.test(q)) {
    const acts = c.decisions.filter((d) => d.action !== 'hold');
    return acts.length
      ? `My plan: ${acts.map((d) => `${d.action} ${d.symbol} — ${d.reason}`).join(' ')}`
      : `Nothing meets my rules right now, so I hold. ${c.brief.lines[0] ?? ''}`;
  }
  return `${c.brief.headline} ${c.brief.lines.slice(0, 2).join(' ')} Ask me about a stock by name — NVDAx, TSLAx, AAPLx, MSFTx or SPYx.`;
}

export async function askAgent(model: string, question: string, c: AiContext): Promise<string> {
  if (!(await getAiKey())) return localAnswer(question, c);
  return chat(model, VOICE, `Owner asks: ${question.slice(0, 500)}\nAnswer in at most 5 sentences from this data: ${context(c)}`);
}
