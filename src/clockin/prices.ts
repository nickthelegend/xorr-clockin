/**
 * Live prices for the real xStocks and SKR — Jupiter's public price API (no key), read-only.
 *
 * The devnet stand-ins have no market of their own; they fill at these prices. `stockData.price` is the issuer's mark
 * for the share, which the agent's guard measures the pool against.
 */
import { SKR_MAINNET_MINT, STOCKS } from './config';
import type { Quote } from './engine';

const URL_V3 = 'https://lite-api.jup.ag/price/v3';

type JupPrice = { usdPrice?: number; priceChange24h?: number; stockData?: { price?: number } };

export type Prices = { quotes: Record<string, Quote>; skrUsd: number | null; at: number };

export async function fetchPrices(signal?: AbortSignal): Promise<Prices> {
  const ids = [...STOCKS.map((s) => s.mainnetMint), SKR_MAINNET_MINT].join(',');
  const res = await fetch(`${URL_V3}?ids=${ids}`, { signal });
  if (!res.ok) throw new Error(`Jupiter price API answered ${res.status}`);
  const body = (await res.json()) as Record<string, JupPrice | null>;
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
