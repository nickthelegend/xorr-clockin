/**
 * CLOCK IN build — the Seeker-first, devnet-only xorr (Solana Mobile CLOCK IN hackathon, 2026-10).
 *
 * The hosted xorr (Vercel + Railway executor) trades real xStocks on Solana MAINNET. This build must never touch that:
 * it talks to Solana devnet directly, needs no server, and every token it moves is a devnet stand-in that says so.
 *
 * What stays real:
 *   - prices: Jupiter's public price API for the real mainnet xStocks (read-only HTTP),
 *   - the permission: an SPL `ApproveChecked` the owner signs, enforced by the token program on devnet,
 *   - the stop: an SPL `Revoke` the owner signs,
 *   - the SKR hook: the owner's real mainnet SKR balance is READ (never moved) and can set the tier.
 *
 * What is a stand-in, labelled everywhere it is drawn:
 *   - dUSDC, the five xStock stand-ins and dSKR are devnet mints whose authority is the CLOCK IN devnet faucet key,
 *   - fills come from that faucet acting as a devnet venue, at the live Jupiter price.
 */
import devnet from './devnet.json';

/** On when the app is built for CLOCK IN (`EXPO_PUBLIC_CLOCKIN=1`). Off for the hosted mainnet build. */
export const CLOCKIN = process.env.EXPO_PUBLIC_CLOCKIN === '1';

/** Devnet only. There is deliberately no switch for another cluster here. */
export const CLUSTER = 'devnet' as const;
export const DEVNET_RPC = process.env.EXPO_PUBLIC_CLOCKIN_RPC || 'https://api.devnet.solana.com';
/** Read-only: the real SKR balance and nothing else. No transaction is ever sent here. */
export const MAINNET_READ_RPC = process.env.EXPO_PUBLIC_CLOCKIN_MAINNET_READ_RPC || 'https://api.mainnet-beta.solana.com';

/** The real Seeker token on mainnet (Solana Mobile, `solanamobile.com/llms.txt`). Read, never moved. */
export const SKR_MAINNET_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
export const SKR_DECIMALS = 6;

export type StockDef = {
  /** The real xStock's symbol, e.g. `NVDAx`. */
  symbol: string;
  name: string;
  /** The real mainnet xStock mint — prices are read for it. */
  mainnetMint: string;
  /** The devnet stand-in mint — this is what moves. */
  devnetMint: string;
  decimals: number;
  c1: string;
  c2: string;
};

type DevnetFile = {
  faucet: string;
  usdc: string;
  skr: string;
  stocks: Record<string, string>;
  createdAt: string;
};

const D = devnet as DevnetFile;

/**
 * The stand-in mints in use. Mutable on purpose: they are the shared set committed in `devnet.json`, unless that set does
 * not exist on the cluster (nobody could fund its creation), in which case this phone creates its own set and
 * `applyMintSet` swaps it in before anything is read (`bootstrap.ts`).
 */
export const DEVNET = {
  faucet: D.faucet,
  usdcMint: D.usdc,
  skrMint: D.skr,
  usdcDecimals: 6,
  skrDecimals: 6,
  /** 'shared': the committed set and xorr's faucet; 'device': a set this phone created and owns the authority of. */
  source: 'shared' as 'shared' | 'device',
};

const META: Omit<StockDef, 'devnetMint'>[] = [
  { symbol: 'NVDAx', name: 'NVIDIA', mainnetMint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', decimals: 8, c1: '#7BD35A', c2: '#2F8F1F' },
  { symbol: 'TSLAx', name: 'Tesla', mainnetMint: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', decimals: 8, c1: '#FF6B5E', c2: '#C2281C' },
  { symbol: 'AAPLx', name: 'Apple', mainnetMint: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', decimals: 8, c1: '#C9CCD3', c2: '#6E737D' },
  { symbol: 'MSFTx', name: 'Microsoft', mainnetMint: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', decimals: 8, c1: '#5B93FF', c2: '#1B44CE' },
  { symbol: 'SPYx', name: 'S&P 500 ETF', mainnetMint: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W', decimals: 8, c1: '#F0BE55', c2: '#C98518' },
];

export const STOCKS: StockDef[] = META.map((m) => ({ ...m, devnetMint: D.stocks[m.symbol] ?? '' }));

export function stockBySymbol(symbol: string): StockDef | undefined {
  return STOCKS.find((s) => s.symbol === symbol);
}

export type MintSet = { faucet: string; usdc: string; skr: string; stocks: Record<string, string> };

export const SHARED_SET: MintSet = { faucet: D.faucet, usdc: D.usdc, skr: D.skr, stocks: { ...D.stocks } };

/** Whether a set of mint addresses is configured (not whether it exists on chain). */
export function devnetReady(): boolean {
  return !!(DEVNET.usdcMint && DEVNET.skrMint && STOCKS.every((s) => s.devnetMint));
}

export function applyMintSet(set: MintSet, source: 'shared' | 'device'): void {
  DEVNET.faucet = set.faucet;
  DEVNET.usdcMint = set.usdc;
  DEVNET.skrMint = set.skr;
  DEVNET.source = source;
  for (const s of STOCKS) s.devnetMint = set.stocks[s.symbol] ?? '';
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export function explorerAddress(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

/** What the app tells a wallet about itself over Mobile Wallet Adapter. */
export const APP_IDENTITY = {
  name: 'xorr · CLOCK IN',
  uri: 'https://xorr.finance',
  icon: 'favicon.ico',
} as const;

/** Starter balances the devnet faucet hands a new wallet — no signature needed, test money only. */
export const STARTER_USDC = 1_000;

/**
 * Logos. Only SKR's, from Solana Mobile's own store CDN: it is drawn on real SKR (read from mainnet) and on dSKR, which
 * is labelled "Devnet stand-in for SKR" wherever it appears. The stock stand-ins and dUSDC get neutral ticker marks
 * (`TokenMark`), not NVIDIA's, Tesla's or Circle's logos: neither the companies nor Backed nor Circle issued them.
 */
export const LOGOS: Record<string, string> = {
  SKR: 'https://r2.solanamobiledappstore.com/skr/seeker.png',
};
export const STARTER_SKR = 250;
