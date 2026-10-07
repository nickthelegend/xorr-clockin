/**
 * `/ask` (CLOCK IN build) — an old link to the agent's conversation. Messages is never a page in xorr: this raises the
 * Messages drawer over Home instead, on the named agent's conversation when the link names one.
 *
 * Development builds also take `q`, a question to put to the agent as if typed, for the simulator screenshot runs.
 */
import React, { useEffect } from 'react';
import { Screen } from '@/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChatDrawer } from '@/chat/chatDrawer';
import { botProse, useThread, userMessage } from '@/bot/thread';
import { executorSentence } from '@/bot/message';
import { askNow } from '@/clockin/desk';

export default function Ask() {
  const router = useRouter();
  const { agent, q } = useLocalSearchParams<{ agent?: string; q?: string }>();
  useEffect(() => {
    router.replace('/');
    useChatDrawer.getState().show(agent ?? null);
    if (__DEV__ && agent && q) {
      const { append } = useThread.getState();
      append(userMessage(q, agent));
      void askNow(q).then((a) => append(botProse(agent, executorSentence(a, 'xorr agent on this phone'))));
    }
  }, [router, agent, q]);
  // Drawn as a screen for the frame it is up, so nothing flashes before Home and the drawer arrive.
  return <Screen />;
}
