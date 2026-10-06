/** The CLOCK IN shell: Today, Agent, SKR, Me. No wallet, no shell — back to /start. */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { colors } from '@/ui';
import { useClockin, useClockinHydrated } from '@/clockin/session';
import { ClockinTabBar, type ClockinTab } from '@/clockin/ui';
import { ensureDesk, friendlyError, useLive } from '@/clockin/desk';
import { useOwner } from '@/clockin/useOwner';

/**
 * Every launch: resolve the stand-in mints (or create this phone's own), and give a wallet that missed its starter
 * dUSDC and dSKR (the app closed mid-setup, the faucet was busy) its funds. See `ensureDesk`.
 */
function EnsureSetup() {
  const owner = useOwner();
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (!owner || tried.current === owner.address) return;
    tried.current = owner.address;
    void (async () => {
      try {
        await ensureDesk(owner);
      } catch (e) {
        useLive.setState({ error: friendlyError(e), setupFailed: true });
      }
    })();
  }, [owner]);
  return null;
}

export default function ClockinLayout() {
  const hydrated = useClockinHydrated();
  const wallet = useClockin((s) => s.wallet);
  const router = useRouter();
  const path = usePathname();
  if (hydrated && !wallet) return <Redirect href="/start" />;
  const active = (['today', 'desk', 'skr', 'me'] as ClockinTab[]).find((t) => path === `/${t}`) ?? 'today';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <EnsureSetup />
      <Tabs
        tabBar={() => <ClockinTabBar active={active} onSelect={(t) => router.navigate(`/${t}` as never)} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tabs.Screen name="today" />
        <Tabs.Screen name="desk" />
        <Tabs.Screen name="skr" />
        <Tabs.Screen name="me" />
      </Tabs>
    </View>
  );
}

export { ScreenError as ErrorBoundary } from '@/errors/ErrorBoundary';
