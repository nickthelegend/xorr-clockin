/**
 * Live prices for the real xStocks and SKR — Jupiter's public price API (no key), read-only.
 *
 * The devnet stand-ins have no market of their own; they fill at these prices. `stockData.price` is the issuer's mark
 * for the share, which the agent's guard measures the pool against.
 */
import { SKR_MAINNET_MINT, STOCKS } from './config';
import type { Quote } from './engine';

/** Jupiter's keyless hosts, in order: the second answers when the first is rate-limiting. */
const HOSTS = ['https://lite-api.jup.ag/price/v3', 'https://api.jup.ag/price/v3'];

type JupPrice = { usdPrice?: number; priceChange24h?: number; stockData?: { price?: number } };

export type Prices = { quotes: Record<string, Quote>; skrUsd: number | null; at: number };

let last: Prices | null = null;
let backoffUntil = 0;
const FRESH_MS = 20_000;

/**
 * Prices, at most one request every 20 seconds; on a rate limit or an outage the last good prices stand (with their
 * time) and the next try waits a minute. Throws only when there has never been a good answer.
 */
export async function fetchPrices(): Promise<Prices> {
  const now = Date.now();
  if (last && now - last.at < FRESH_MS) return last;
  if (now < backoffUntil) {
    if (last) return last;
    throw new Error('Jupiter is rate-limiting price reads; trying again shortly.');
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    try {
      last = await fetchOnce(controller.signal);
    } finally {
      clearTimeout(t);
    }
    return last;
  } catch (e) {
    backoffUntil = Date.now() + 60_000;
    if (last) return last;
    throw e;
  }
}

async function fetchOnce(signal?: AbortSignal): Promise<Prices> {
  const ids = [...STOCKS.map((s) => s.mainnetMint), SKR_MAINNET_MINT].join(',');
  let body: Record<string, JupPrice | null> | null = null;
  let status = 0;
  for (const host of HOSTS) {
    const res = await fetch(`${host}?ids=${ids}`, { signal }).catch(() => null);
    status = res?.status ?? 0;
    if (res?.ok) {
      body = (await res.json()) as Record<string, JupPrice | null>;
      break;
    }
  }
  if (!body) throw new Error(`Jupiter's price API answered ${status || 'nothing'}`);
  const quotes: Record<string, Quote> = {};
  for (const s of STOCKS) {
    const p = body[s.mainnetMint];
    if (!p?.usdPrice || !(p.usdPrice > 0)) continue;
    quotes[s.symbol] = {
      symbol: s.symbol,
      usd: p.usdPrice,
      change24h: typeof p.priceChange24h === 'number' ? p.priceChange24h : null,
      mark: p.stockData?.price && p.stockData.price > 0 ? p.stockData.price : null,
    };
  }
  const skr = body[SKR_MAINNET_MINT]?.usdPrice;
  return { quotes, skrUsd: skr && skr > 0 ? skr : null, at: Date.now() };
}
