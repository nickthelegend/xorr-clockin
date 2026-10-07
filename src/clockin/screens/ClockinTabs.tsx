/**
 * The tab shell in the CLOCK IN build — xorr's own TabBar (Home, Trade, Ask). Trade opens the agent's permission and
 * trading; Ask opens the conversation with the agent. No wallet, no shell: back to Start.
 *
 * Every launch, the stand-in mints are resolved (or this phone creates its own) and a wallet that missed its starter
 * dUSDC and dSKR gets them (`ensureDesk`).
 */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { TabBar, colors } from '@/ui';
import { ensureDesk, friendlyError, useLive } from '../desk';
import { useClockin, useClockinHydrated } from '../session';
import { useOwner } from '../useOwner';

function EnsureSetup() {
  const owner = useOwner();
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (!owner || tried.current === owner.address) return;
    tried.current = owner.address;
    void ensureDesk(owner).catch((e) => useLive.setState({ error: friendlyError(e), setupFailed: true }));
  }, [owner]);
  return null;
}

export default function ClockinTabs() {
  const hydrated = useClockinHydrated();
  const wallet = useClockin((s) => s.wallet);
  const router = useRouter();
  const pathname = usePathname();
  if (hydrated && !wallet) return <Redirect href="/start" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <EnsureSetup />
      <Tabs
        tabBar={() => (
          <TabBar
            active={pathname === '/' ? 'home' : null}
            onHome={() => router.navigate('/')}
            onSwap={() => router.push('/desk')}
            onMessages={() => router.push('/ask')}
            labels={{ swap: 'Trade', messages: 'Ask' }}
          />
        )}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="more" />
        <Tabs.Screen name="markets" />
        <Tabs.Screen name="holdings" />
        <Tabs.Screen name="bot" />
      </Tabs>
    </View>
  );
}
