import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } }));
vi.mock('expo-router', () => ({ useFocusEffect: () => undefined, useLocalSearchParams: () => ({}) }));

describe('a busy devnet faucet reads as busy, not broken', () => {
  it('classifies rate limits and airdrop refusals', async () => {
    const { isFaucetBusy, friendlyError, FAUCET_BUSY } = await import('./desk');
    expect(isFaucetBusy(new Error('429 Too Many Requests: airdrop request failed'))).toBe(true);
    expect(isFaucetBusy(new Error("You've either reached your airdrop limit today or the airdrop faucet has run dry"))).toBe(true);
    expect(friendlyError(new Error('airdrop request failed. This can happen when the rate limit is reached.'))).toBe(FAUCET_BUSY);
    expect(friendlyError(new Error('The wallet declined. Nothing was signed.'))).toBe('The wallet declined. Nothing was signed.');
  });
});
