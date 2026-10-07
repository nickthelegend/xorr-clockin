/**
 * The tab shell in the CLOCK IN build — xorr's own TabBar (Home, Trade, Messages). Trade opens your agent (look now, hire a shift);
 * Messages raises xorr's drawer of conversations with the agents. No wallet, no shell: back to Start.
 *
 * Every launch, the stand-in mints are resolved (or this phone creates its own) and a wallet that missed its starter
 * dUSDC and dSKR gets them (`ensureDesk`).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { TabBar, colors } from '@/ui';
import { useThread } from '@/bot/thread';
import { useChatAgents } from '@/chat/agents';
import { useChatDrawer } from '@/chat/chatDrawer';
import { summaries, unreadTotal } from '@/chat/conversations';
import { useVoice } from '@/chat/voice';
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
  // xorr's Messages drawer, as the hosted tab shell drives it: the bar's chat button raises it, and steps aside for it.
  const show = useChatDrawer((s) => s.show);
  const drawerRaised = useChatDrawer((s) => s.raised);
  const messages = useThread((s) => s.messages);
  const read = useThread((s) => s.read);
  const hydrateThread = useThread((s) => s.hydrate);
  const readVoice = useVoice((s) => s.read);
  const agents = useChatAgents();
  useEffect(() => {
    void hydrateThread();
    void readVoice();
  }, [hydrateThread, readVoice]);
  const unread = useMemo(() => unreadTotal(summaries(messages, agents.map((a) => a.name), read)), [messages, agents, read]);
  if (hydrated && !wallet) return <Redirect href="/start" />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <EnsureSetup />
      <Tabs
        tabBar={() => (
          <TabBar
            active={pathname === '/' ? 'home' : null}
            onHome={() => router.navigate('/')}
            onSwap={() => router.push('/agent/momentum')}
            onMessages={() => show()}
            unread={unread}
            hidden={drawerRaised}
            labels={{ swap: 'Trade' }}
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
