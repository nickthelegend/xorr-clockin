/** The CLOCK IN shell: Today, Agent, SKR, Me. No wallet, no shell — back to /start. */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { colors } from '@/ui';
import { useClockin, useClockinHydrated } from '@/clockin/session';
import { ClockinTabBar, type ClockinTab } from '@/clockin/ui';
import { claimStarterSkr, fundStarter, useLive } from '@/clockin/desk';
import { useOwner } from '@/clockin/useOwner';

/**
 * A connected wallet that never got its starter dUSDC and dSKR (the app closed mid-setup, the faucet was busy) gets
 * them here, once per launch. No signature: the faucet pays and mints.
 */
function EnsureSetup() {
  const owner = useOwner();
  const funded = useClockin((s) => s.funded);
  const starter = useClockin((s) => s.starterSkr);
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (!owner || (funded && starter) || tried.current === owner.address) return;
    tried.current = owner.address;
    void (async () => {
      try {
        if (!useClockin.getState().funded) await fundStarter(owner);
        if (!useClockin.getState().starterSkr) await claimStarterSkr(owner);
      } catch (e) {
        useLive.setState({ error: `The devnet faucet could not set this wallet up: ${(e as Error).message}` });
      }
    })();
  }, [owner, funded, starter]);
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
