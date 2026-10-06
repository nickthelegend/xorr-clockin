/** The CLOCK IN shell: Today, Agent, SKR, Me. No wallet, no shell — back to /start. */
import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { colors } from '@/ui';
import { useClockin, useClockinHydrated } from '@/clockin/session';
import { ClockinTabBar, type ClockinTab } from '@/clockin/ui';

export default function ClockinLayout() {
  const hydrated = useClockinHydrated();
  const wallet = useClockin((s) => s.wallet);
  const router = useRouter();
  const path = usePathname();
  if (hydrated && !wallet) return <Redirect href="/start" />;
  const active = (['today', 'desk', 'skr', 'me'] as ClockinTab[]).find((t) => path === `/${t}`) ?? 'today';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
