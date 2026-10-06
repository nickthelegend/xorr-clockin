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

export async function askAgent(model: string, question: string, c: AiContext): Promise<string> {
  return chat(model, VOICE, `Owner asks: ${question.slice(0, 500)}\nAnswer in at most 5 sentences from this data: ${context(c)}`);
}
