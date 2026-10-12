import { describe, expect, it } from 'vitest';
import { brief, decide, type EngineInput } from './engine';
const input = (): EngineInput => ({
  quotes: { NVDAx: { symbol: 'NVDAx', usd: 100, mark: 100, change24h: 1 } },
  holdings: {}, allowanceUsd: 100, cashUsd: 100, perTradeUsd: 10,
  strategies: ['momentum'], boughtToday: [], now: new Date('2026-10-08T15:00:00Z'),
});
describe('agent waits for usable price and spending data', () => {
  it('still buys with a valid quote and budget', () => expect(decide(input())[0]).toMatchObject({ action: 'buy', usd: 10 }));
  it.each([NaN, Infinity, -Infinity, -1, 0])('does not trade on invalid USD price %s', (usd) => {
    const i = input(); i.quotes.NVDAx!.usd = usd;
    i.holdings.NVDAx = { symbol: 'NVDAx', qty: 2, cost: 200 };
    expect(decide(i)[0]!.action).toBe('hold');
  });
  it.each(['allowanceUsd', 'cashUsd', 'perTradeUsd'] as const)('does not emit a NaN trade for unknown %s', (key) => {
    const i = input(); i[key] = NaN;
    expect(decide(i)[0]!.action).toBe('hold');
  });
  it.each(['mark', 'change24h'] as const)('rejects nonfinite quote field %s', (key) => {
    const i = input(); i.quotes.NVDAx![key] = Infinity;
    expect(decide(i)[0]!.action).toBe('hold');
  });
});

describe('daily brief with incomplete price data', () => {
  const data = () => ({ ...input(), previous: null, permissionLive: true, streak: 1, decisions: [], holdings: { NVDAx: { symbol: 'NVDAx', qty: 2, cost: 200 } } });
  it('does not call a missing quote a total loss of the position', () => {
    const i = data(); i.quotes = {};
    const result = brief(i);
    expect(result.headline).toContain('Waiting for NVDAx prices');
    expect(result.headline).not.toContain('down $200'); expect(result.mood).toBe('flat');
  });
  it('shows genuine book change once every position has a quote', () => {
    const i = data(); i.quotes.NVDAx!.usd = 110;
    expect(brief(i).headline).toContain('up $20.00');
  });
  it('invalid daily changes never become the biggest mover', () => {
    const i = { ...data(), holdings: {}, quotes: { NVDAx: { symbol: 'NVDAx', usd: 100, mark: 100, change24h: NaN } } };
    const result = brief(i);
    expect(JSON.stringify(result)).not.toContain('NaN');
  });
});
