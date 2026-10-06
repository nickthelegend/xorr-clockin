/**
 * CLOCK IN — the way in. Seeker-first: on Android the first button opens Mobile Wallet Adapter, which on a Seeker is
 * Seed Vault. Next to it, Privy's email wallet, and a devnet guest wallet for iOS, emulators and anyone without one.
 *
 * Whichever way in, the new wallet is set up without a single signature: the devnet faucet pays for its token accounts
 * and hands it test dUSDC and a welcome grant of dSKR, so the first thing a person signs is something that matters.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { brand } from '@/design/brand';
import { CoinHero } from '@/design/CoinHero';
import { Button, Fill, Screen, Text, colors, radius, space } from '@/ui';
import { Rise } from '@/ui/Rise';
import { successTap, warningTap } from '@/ui/haptics';
import { useAuth, useEmailLogin } from '@/auth/useAuth';
import { DEVNET_READY } from '@/clockin/config';
import { claimStarterSkr, fundStarter } from '@/clockin/desk';
import { guestKeypair, faucetKeypair } from '@/clockin/chain';
import { MWA_AVAILABLE, mwaConnect } from '@/clockin/mwa';
import { PRIVY_IN_CLOCKIN, usePrivySolana } from '@/clockin/privySign';
import { useClockin, useClockinHydrated, type ConnectedWallet } from '@/clockin/session';
import { useOwner } from '@/clockin/useOwner';
import { Banner, DevnetPill } from '@/clockin/ui';
import { useAutopilot } from '@/clockin/autopilot';

const WORDMARK = require('../assets/brand/xorr-wordmark.png');

export default function Start() {
  const router = useRouter();
  const hydrated = useClockinHydrated();
  const wallet = useClockin((s) => s.wallet);
  const connect = useClockin((s) => s.connect);
  const owner = useOwner();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(false);

  // Once a wallet is connected, set it up (no signature) and go to Today. Once per connection.
  const settingUp = useRef(false);
  useEffect(() => {
    if (!owner || !busy?.startsWith('Setting up') || settingUp.current) return;
    settingUp.current = true;
    void (async () => {
      try {
        const s = useClockin.getState();
        if (!s.funded) await fundStarter(owner);
        if (!useClockin.getState().starterSkr) await claimStarterSkr(owner);
        successTap();
        router.replace('/today');
      } catch (e) {
        warningTap();
        if (__DEV__) console.log('[clockin] setup failed', e);
        setError(`Connected, but the devnet faucet could not set you up: ${(e as Error).message}`);
        setBusy(null);
      } finally {
        settingUp.current = false;
      }
    })();
  }, [owner, busy, router]);

  useAutopilot({ guest: () => guest(), mwa: () => mwa() }, hydrated);

  if (hydrated && wallet && !busy && !error) return <Redirect href="/today" />;

  async function go(label: string, get: () => Promise<ConnectedWallet>) {
    setError(null);
    setBusy(label);
    try {
      const w = await get();
      connect(w);
      setBusy('Setting up your devnet desk…');
    } catch (e) {
      warningTap();
      if (__DEV__) console.log('[clockin] connect failed', e);
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const mwa = () =>
    go('Opening your wallet…', async () => {
      const auth = await mwaConnect();
      return { kind: 'mwa', address: auth.address, mwa: auth, label: auth.walletName ?? 'Seed Vault / MWA wallet' };
    });
  const guest = () =>
    go('Making a devnet guest wallet…', async () => {
      const kp = await guestKeypair();
      return { kind: 'guest', address: kp.publicKey.toBase58() };
    });

  const missing = !DEVNET_READY ? 'This build has no devnet mints configured.' : !faucetKeypair() ? 'This build has no devnet faucet key.' : null;

  return (
    <Screen gutter="none">
      <Fill>
        <Rise index={0} style={{ flex: 1 }}>
          <CoinHero style={{ flex: 1 }} />
          <View style={{ position: 'absolute', top: space.s8, left: 0, right: 0, alignItems: 'center', gap: space.s10 }}>
            <Image source={WORDMARK} accessibilityLabel={brand.WORDMARK} style={{ width: 90, height: 18 }} contentFit="contain" />
            <DevnetPill />
          </View>
        </Rise>
      </Fill>
      <View style={{ paddingHorizontal: space.gutter }}>
        <Rise index={1}>
          <Text variant="onboardingTitle" align="center">
            Your AI stock agent.{'\n'}Clock in every morning.
          </Text>
          <Text variant="secondary" color={colors.ink55} align="center" style={{ marginTop: space.s10 }}>
            It trades tokenized US stocks inside an on-chain permission you can revoke in one tap, writes you a brief each
            day, and pays you SKR for showing up. This build runs on Solana devnet with test tokens.
          </Text>
        </Rise>
        <Rise index={2} style={{ marginTop: space.s22, gap: space.s10 }}>
          {error ? <Banner text={error} tone="down" /> : null}
          {missing ? <Banner text={`${missing} See HANDOFF.md.`} /> : null}
          {email && PRIVY_IN_CLOCKIN ? (
            <PrivyEmail onWallet={(address) => go('Connecting your Privy wallet…', async () => ({ kind: 'privy', address }))} onCancel={() => setEmail(false)} />
          ) : (
            <>
              {Platform.OS === 'android' && MWA_AVAILABLE ? (
                <Button label={busy ?? 'Connect wallet · Seed Vault'} loading={!!busy} onPress={mwa} testID="connect-mwa" />
              ) : null}
              <Button
                label={Platform.OS === 'android' ? 'Try with a devnet guest wallet' : busy ?? 'Start with a devnet guest wallet'}
                variant={Platform.OS === 'android' ? 'secondary' : 'primary'}
                loading={Platform.OS !== 'android' && !!busy}
                disabled={!!busy}
                onPress={guest}
                testID="connect-guest"
              />
              {PRIVY_IN_CLOCKIN ? <Button label="Sign in with email (Privy)" variant="ghost" disabled={!!busy} onPress={() => setEmail(true)} testID="connect-privy" /> : null}
              {Platform.OS !== 'android' ? (
                <Text variant="footnote" color={colors.ink45} align="center">
                  Mobile Wallet Adapter (Seed Vault) is Android-only — on a Seeker the first button is your wallet.
                </Text>
              ) : null}
            </>
          )}
        </Rise>
      </View>
    </Screen>
  );
}

/** Privy's email code, inline. Privy makes the embedded Solana wallet; it signs devnet transactions like any other. */
function PrivyEmail({ onWallet, onCancel }: { onWallet: (address: string) => void; onCancel: () => void }) {
  const { sendCode, loginWithCode } = useEmailLogin();
  const auth = useAuth();
  const privy = usePrivySolana();
  const [addr, setAddr] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.authenticated && !privy.address) void auth.createWallet().catch(() => undefined);
    if (auth.authenticated && privy.address) onWallet(privy.address);
  }, [auth, privy.address, onWallet]);

  const input = { backgroundColor: colors.inputBg, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.inputBorder, color: colors.ink, paddingHorizontal: 14, height: 50, fontSize: 16 } as const;
  return (
    <View style={{ gap: space.s10 }}>
      {err ? <Banner text={err} tone="down" /> : null}
      <TextInput style={input} placeholder="you@example.com" placeholderTextColor={colors.ink38} autoCapitalize="none" keyboardType="email-address" value={addr} onChangeText={setAddr} editable={!sent} />
      {sent ? <TextInput style={input} placeholder="6-digit code" placeholderTextColor={colors.ink38} keyboardType="number-pad" value={code} onChangeText={setCode} /> : null}
      <Button
        label={sent ? 'Verify code' : 'Email me a code'}
        loading={busy}
        onPress={async () => {
          setErr(null);
          setBusy(true);
          try {
            if (!sent) {
              await sendCode({ email: addr.trim() });
              setSent(true);
            } else await loginWithCode({ code: code.trim(), email: addr.trim() });
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button label="Back" variant="ghost" onPress={onCancel} />
    </View>
  );
}
