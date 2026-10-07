/**
 * First run, part one — three short screens in xorr's onboarding style (Progress, the onboarding title, consequence
 * cards): what the agent does, the permission you can take back, and the daily clock-in with SKR. Skippable; seen once
 * per device (`introSeen`). Then the guided first grant (`/setup`).
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AgentOrb, Button, ConsequenceCard, Fill, Progress, Screen, Text, colors, size, space } from '@/ui';
import { Rise } from '@/ui/Rise';
import { selectionTick } from '@/ui/haptics';
import { CLOCKIN_AGENTS } from '@/clockin/agents';
import { useAutopilot } from '@/clockin/autopilot';
import { useClockin } from '@/clockin/session';

type Page = {
  title: string;
  lead: string;
  cards: { tone: 'up' | 'down' | 'warn'; label: string; detail: string }[];
};

const PAGES: Page[] = [
  {
    title: 'Meet your agent',
    lead: 'It watches tokenized US stocks around the clock, so you don’t have to.',
    cards: [
      { tone: 'up', label: 'It buys on rules, not hunches', detail: 'Momentum, dips, the off-hours discount — each strategy is an agent you can hire.' },
      { tone: 'up', label: 'It says why', detail: 'Every buy, sell and hold comes with its reason, priced from Jupiter’s live quotes.' },
      { tone: 'warn', label: 'It checks the price twice', detail: 'When the Solana pool and the issuer’s own mark disagree, it holds.' },
    ],
  },
  {
    title: 'A permission you can take back',
    lead: 'Your agent never holds your money. It spends inside a cap you sign.',
    cards: [
      { tone: 'up', label: 'It can buy up to your cap', detail: 'One SPL approval you sign. The token program refuses anything past it — not xorr.' },
      { tone: 'down', label: 'It cannot withdraw', detail: 'It can only buy and sell stock tokens for you, from your own wallet.' },
      { tone: 'up', label: 'You can take it back in one tap', detail: 'Hold Stop all trading and every approval is revoked on chain.' },
    ],
  },
  {
    title: 'Clock in every morning',
    lead: 'Thirty seconds a day: read the brief, sign once, keep your streak.',
    cards: [
      { tone: 'up', label: 'A morning brief', detail: 'What your book did, what moved since yesterday, and what the agent plans.' },
      { tone: 'up', label: 'SKR for showing up', detail: 'Every clock-in pays SKR, more for a streak and 1.5× on a Seeker.' },
      { tone: 'up', label: 'Spend it on your agent', detail: 'Hire Night Shift or Dip Buyer for a day, or hold SKR for a tier.' },
    ],
  },
];

export default function Intro() {
  const router = useRouter();
  const set = useClockin((s) => s.set);
  const [page, setPage] = useState(0);
  const p = PAGES[page]!;
  const last = page === PAGES.length - 1;

  function finish(toSetup: boolean) {
    set({ introSeen: true });
    router.replace(toSetup ? '/setup' : '/');
  }
  function next() {
    selectionTick();
    if (last) finish(true);
    else setPage(page + 1);
  }

  useAutopilot({ next, skip: () => finish(false), p2: () => setPage(1), p3: () => setPage(2) });

  return (
    <Screen>
      <Progress step={page + 1} total={PAGES.length} onBack={page > 0 ? () => setPage(page - 1) : () => finish(false)} />

      <Rise index={0} key={`h-${page}`}>
        {page === 0 ? (
          <View style={{ flexDirection: 'row', gap: space.s10, marginTop: space.s26 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {CLOCKIN_AGENTS.map((a) => (
              <AgentOrb key={a.id} gradient={a.gradient} size={size.orb52} face />
            ))}
          </View>
        ) : null}
        <Text variant="onboardingTitle" style={{ marginTop: space.s26 }} accessibilityRole="header">
          {p.title}
        </Text>
        <Text variant="body" color={colors.ink55} style={{ marginTop: space.s10 }}>
          {p.lead}
        </Text>
      </Rise>

      <Fill style={{ marginTop: space.s22 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space.s10, paddingBottom: space.s16 }}>
          {p.cards.map((c, i) => (
            <Rise key={`${page}-${c.label}`} index={i + 1}>
              <ConsequenceCard tone={c.tone} label={c.label} detail={c.detail} />
            </Rise>
          ))}
          {page === 2 ? (
            <Text variant="footnote" color={colors.ink55} style={{ marginTop: space.s6 }}>
              This build runs on Solana devnet with test tokens. Nothing here is real money.
            </Text>
          ) : null}
        </ScrollView>
      </Fill>

      <Button label={last ? 'Set up your agent' : 'Continue'} onPress={next} testID="intro-next" />
      <Button label="Skip — look around first" variant="ghost" onPress={() => finish(false)} style={{ marginTop: space.s10 }} testID="intro-skip" />
    </Screen>
  );
}
