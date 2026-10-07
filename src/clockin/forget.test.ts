import { describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => storage.get(k) ?? null,
    setItem: async (k: string, v: string) => void storage.set(k, v),
    removeItem: async (k: string) => void storage.delete(k),
  },
}));

describe('Disconnect forgets everything this phone kept', () => {
  it('deletes the guest, agent, venue and OpenRouter keys, the device mint set, and signs the wallet out', async () => {
    const { getSecret, setSecret } = await import('./secret');
    const { forgetDevice, DEVICE_SECRETS } = await import('./forget');
    const { SET_KEY } = await import('./bootstrap');
    expect([...DEVICE_SECRETS].sort()).toEqual(['xorr.clockin.agent', 'xorr.clockin.guest', 'xorr.clockin.openrouter', 'xorr.clockin.venue']);

    for (const k of DEVICE_SECRETS) await setSecret(k, `secret-${k}`);
    storage.set(SET_KEY, '{"usdc":"x"}');
    const deauthorizeWallet = vi.fn(async () => undefined);
    const privyLogout = vi.fn(async () => undefined);

    const r = await forgetDevice({ deauthorizeWallet, privyLogout });

    for (const k of DEVICE_SECRETS) expect(await getSecret(k)).toBeNull();
    expect(storage.has(SET_KEY)).toBe(false);
    expect(deauthorizeWallet).toHaveBeenCalledOnce();
    expect(privyLogout).toHaveBeenCalledOnce();
    expect(r.walletSignedOut).toBe(true);
  });

  it('still deletes the keys when the wallet app or Privy fails to sign out', async () => {
    const { getSecret, setSecret } = await import('./secret');
    const { forgetDevice, DEVICE_SECRETS } = await import('./forget');
    for (const k of DEVICE_SECRETS) await setSecret(k, 'x');

    const r = await forgetDevice({ deauthorizeWallet: async () => Promise.reject(new Error('no wallet app')), privyLogout: async () => Promise.reject(new Error('offline')) });

    for (const k of DEVICE_SECRETS) expect(await getSecret(k)).toBeNull();
    expect(r.walletSignedOut).toBe(false);
  });
});
