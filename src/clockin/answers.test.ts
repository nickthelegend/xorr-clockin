import { describe, expect, it } from 'vitest';
import { localAnswer } from './ai';

const ctx = {
  brief: { headline: 'Book is up $1.00.', lines: ['Nasdaq is open.', 'Plan: buy $25 NVDAx.'], mood: 'up' as const },
  decisions: [
    { symbol: 'NVDAx', action: 'buy' as const, usd: 25, strategy: 'momentum' as const, reason: 'Up +1.90% on the day.' },
    { symbol: 'TSLAx', action: 'hold' as const, reason: 'Guard: the pool is +1.8% from the issuer.' },
  ],
  quotes: {
    NVDAx: { symbol: 'NVDAx', usd: 240, change24h: 1.9, mark: 240 },
    TSLAx: { symbol: 'TSLAx', usd: 380, change24h: -0.5, mark: 373 },
  },
  holdings: { NVDAx: { symbol: 'NVDAx', qty: 0.1, cost: 23 } },
  cashUsd: 900,
  tier: 'Bronze',
  streak: 2,
};

describe('Ask your agent, without a model', () => {
  it('answers about a named stock from its own decision', () => {
    const a = localAnswer('Why did you buy NVDA?', ctx);
    expect(a).toMatch(/NVDAx is \$240\.00/);
    expect(a).toMatch(/I hold 0\.1000 that cost \$23\.00/);
    expect(a).toMatch(/buy \$25: Up \+1\.90%/);
    expect(localAnswer('what about tslax', ctx)).toMatch(/hold: Guard/);
  });
  it('says what it bought, or that it has not traded yet', () => {
    expect(localAnswer('What did you buy?', { ...ctx, recent: ['bought $25.00 TSLAx'] })).toMatch(/Lately: bought \$25\.00 TSLAx/);
    expect(localAnswer('What did you buy?', ctx)).toMatch(/not traded yet/);
  });
  it('answers the plan, and falls back to the brief', () => {
    expect(localAnswer("what's the plan today?", ctx)).toMatch(/My plan: buy NVDAx/);
    expect(localAnswer('hello', ctx)).toMatch(/^Book is up \$1\.00\./);
  });
});
