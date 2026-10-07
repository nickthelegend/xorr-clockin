/**
 * CLOCK IN — the way in. Seeker-first: on Android the first button opens Mobile Wallet Adapter, which on a Seeker is
 * Seed Vault. Next to it, Privy's email wallet, and a devnet guest wallet for iOS, emulators and anyone without one.
 *
 * Whichever way in, the new wallet is set up without a single signature: the devnet faucet pays for its token accounts
 * and hands it test dUSDC and a welcome grant of dSKR, so the first thing a person signs is something that matters.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { brand } from '@/design/brand';
import { CoinHero } from '@/design/CoinHero';
import { Button, Fill, Field, Press, Screen, Tag, Text, colors, size, space } from '@/ui';
import { Rise } from '@/ui/Rise';
import { successTap, warningTap } from '@/ui/haptics';
import { useAuth, useEmailLogin } from '@/auth/useAuth';
import { ensureDesk, friendlyError, isFaucetBusy } from '@/clockin/desk';
import { guestKeypair, faucetKeypair } from '@/clockin/chain';
import { MWA_AVAILABLE, mwaConnect } from '@/clockin/mwa';
import { PRIVY_IN_CLOCKIN, usePrivySolana } from '@/clockin/privySign';
import { useClockin, useClockinHydrated, type ConnectedWallet } from '@/clockin/session';
import { useOwner } from '@/clockin/useOwner';
import { FailureNote } from '@/ui/States';
import { useAutopilot } from '@/clockin/autopilot';

const WORDMARK = require('../assets/brand/xorr-wordmark.png');
/** The wordmark art is 833×166; drawn at the landing header's height, as xorr's welcome draws it. */
const WORDMARK_H = 18;
const WORDMARK_W = Math.round((WORDMARK_H * 833) / 166);

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
        await ensureDesk(owner);
        successTap();
        const s = useClockin.getState();
        router.replace(!s.introSeen ? '/intro' : !s.firstRunDone ? '/setup' : '/');
      } catch (e) {
        warningTap();
        if (__DEV__) console.log('[clockin] setup failed', e);
        setError(isFaucetBusy(e) ? friendlyError(e) : `Connected, but setting up your devnet desk failed: ${(e as Error).message}`);
        setBusy(null);
      } finally {
        settingUp.current = false;
      }
    })();
  }, [owner, busy, router]);

  useAutopilot({ guest: () => guest(), mwa: () => mwa(), email: () => setEmail(true) }, hydrated);

  if (hydrated && wallet && !busy && !error) return <Redirect href="/" />;

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

  const missing = !faucetKeypair() ? 'This build has no devnet faucet key.' : null;

  return (
    <Screen gutter="none">
      <Fill>
        <Rise index={0} style={{ flex: 1 }}>
          <CoinHero style={{ flex: 1 }} />
          <View style={{ position: 'absolute', top: space.s8, left: 0, right: 0, alignItems: 'center' }}>
            <Image source={WORDMARK} accessibilityLabel={brand.WORDMARK} style={{ width: WORDMARK_W, height: WORDMARK_H }} contentFit="contain" />
          </View>
        </Rise>
      </Fill>
      <View style={{ paddingHorizontal: space.gutter }}>
        <Rise index={1}>
          <Text variant="onboardingTitle" align="center">
            {brand.TAGLINE}
          </Text>
        </Rise>
        <Rise index={2} style={{ marginTop: space.s26 }}>
          {error ? <FailureNote error={new Error(error)} style={{ marginBottom: space.s10 }} /> : null}
          {error && wallet ? (
            <Button
              label="Try again"
              onPress={() => {
                setError(null);
                setBusy('Setting up your devnet desk…');
              }}
              style={{ marginTop: space.s10 }}
              testID="retry-setup"
            />
          ) : null}
          {missing ? <FailureNote error={new Error(missing)} style={{ marginBottom: space.s10 }} /> : null}
          {email && PRIVY_IN_CLOCKIN ? (
            <PrivyEmail onWallet={(address) => go('Connecting your Privy wallet…', async () => ({ kind: 'privy', address }))} onCancel={() => setEmail(false)} />
          ) : Platform.OS === 'android' && MWA_AVAILABLE ? (
            <>
              {/* Seeker-first: Mobile Wallet Adapter, which on a Seeker is Seed Vault. */}
              <Button label={busy ?? 'Connect wallet'} loading={!!busy} onPress={mwa} testID="connect-mwa" />
              {PRIVY_IN_CLOCKIN ? (
                <Button label="Sign in" variant="ghost" disabled={!!busy} onPress={() => setEmail(true)} style={{ marginTop: space.s10 }} testID="connect-privy" />
              ) : null}
              <Press onPress={guest} disabled={!!busy} accessibilityRole="button" hitHeight={size.hit} style={{ alignSelf: 'center', marginTop: space.s6 }} testID="connect-guest">
                <Text variant="footnote" color={colors.ink65}>
                  No wallet? Try it with a devnet guest wallet
                </Text>
              </Press>
            </>
          ) : (
            <>
              <Button label={busy ?? 'Get started'} loading={!!busy} onPress={guest} testID="connect-guest" />
              {PRIVY_IN_CLOCKIN ? (
                <Button label="Sign in" variant="ghost" disabled={!!busy} onPress={() => setEmail(true)} style={{ marginTop: space.s10 }} testID="connect-privy" />
              ) : null}
            </>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: space.s12 }}>
            <Text variant="footnote" color={colors.ink55}>
              {'By continuing you agree to the '}
            </Text>
            <Press onPress={() => router.push('/legal/terms')} accessibilityRole="link" accessibilityLabel="Read the Terms" hitHeight={size.hit}>
              <Text variant="footnote" color={colors.ink}>
                Terms
              </Text>
            </Press>
            <Text variant="footnote" color={colors.ink55}>
              {' and '}
            </Text>
            <Press onPress={() => router.push('/legal/privacy')} accessibilityRole="link" accessibilityLabel="Read the Privacy Policy" hitHeight={size.hit}>
              <Text variant="footnote" color={colors.ink}>
                Privacy Policy
              </Text>
            </Press>
            <Text variant="footnote" color={colors.ink55}>
              .
            </Text>
          </View>
          <View style={{ alignItems: 'center', marginTop: space.s8 }}>
            <Tag label="Devnet · test tokens" tone="warn" small />
          </View>
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
  const reported = useRef(false);

  // Android's back button closes the email step rather than leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [onCancel]);

  useEffect(() => {
    if (auth.authenticated && !privy.address) void auth.createWallet().catch(() => undefined);
    // Once: the parent re-renders while it connects, and hands down a new callback each time.
    if (auth.authenticated && privy.address && !reported.current) {
      reported.current = true;
      onWallet(privy.address);
    }
  }, [auth, privy.address, onWallet]);

  return (
    <View style={{ gap: space.s10 }}>
      {err ? <FailureNote error={new Error(err)} /> : null}
      <Field label="Email" placeholder="you@example.com" keyboard="email-address" value={addr} onChange={setAddr} editable={!sent} />
      {sent ? <Field label="Code" placeholder="6-digit code" keyboard="number-pad" value={code} onChange={setCode} /> : null}
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
