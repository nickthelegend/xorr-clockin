/**
 * Ask your agent — the conversation behind Home's Messages button (CLOCK IN build).
 *
 * Answers come from the agent's own numbers (`localAnswer`): a stock's decision and reason, the plan, the book. With
 * the owner's own OpenRouter key (Profile), a model answers in its own words from the same numbers. Either way, the
 * decisions stay the agent's rules.
 */
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useGoBack } from '@/nav/useGoBack';
import { AgentOrb, BackButton, IconButton, Press, Screen, Text, colors, radius, space } from '@/ui';
import { selectionTick } from '@/ui/haptics';
import { askAgent } from '@/clockin/ai';
import { useAutopilot } from '@/clockin/autopilot';
import { useClockin } from '@/clockin/session';
import { currentStreak } from '@/clockin/streak';
import { useDesk } from '@/clockin/useDesk';

type Msg = { from: 'you' | 'agent'; text: string };

const SUGGESTIONS = ['What’s the plan today?', 'Why NVDAx?', 'How is TSLAx doing?', 'What did you buy?'];

export default function Ask() {
  const goBack = useGoBack('/');
  const { live, st, plan } = useDesk();
  const aiModel = useClockin((s) => s.aiModel);
  const streak = useClockin((s) => s.streak);
  const [messages, setMessages] = useState<Msg[]>(() => [{ from: 'agent', text: `${plan.brief.headline} Ask me about the plan, or about a stock by name.` }]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const list = useRef<ScrollView>(null);

  async function send(text: string = draft) {
    const q = text.trim();
    if (!q || thinking) return;
    selectionTick();
    setDraft('');
    setMessages((m) => [...m, { from: 'you', text: q }]);
    setThinking(true);
    try {
      const a = await askAgent(aiModel, q, {
        brief: plan.brief,
        decisions: plan.decisions,
        quotes: live.prices?.quotes ?? {},
        holdings: st.holdings,
        cashUsd: st.cashUsd,
        tier: st.tier.name,
        streak: currentStreak(streak),
      });
      setMessages((m) => [...m, { from: 'agent', text: a }]);
    } catch (e) {
      setMessages((m) => [...m, { from: 'agent', text: (e as Error).message }]);
    } finally {
      setThinking(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  useAutopilot({ ask: () => send('Why did you buy NVDAx?'), plan: () => send('What’s the plan today?') }, !!live.prices);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s8 }}>
        <BackButton onPress={() => goBack()} />
        <AgentOrb gradient={colors.agent.momentum} size={52} face />
        <View style={{ flex: 1 }}>
          <Text variant="cardTitleLg">Your agent</Text>
          <Text variant="secondarySm" color={colors.ink45}>
            {st.permission.live ? 'Working inside your permission' : 'Watching · no permission'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
        <ScrollView ref={list} style={{ flex: 1, marginTop: space.s16 }} contentContainerStyle={{ gap: space.s10, paddingBottom: space.s12 }} keyboardShouldPersistTaps="handled">
          {messages.map((m, i) => (
            <View
              key={i}
              style={{
                alignSelf: m.from === 'you' ? 'flex-end' : 'flex-start',
                maxWidth: '86%',
                backgroundColor: m.from === 'you' ? colors.ink : colors.bubble,
                borderRadius: radius.card,
                paddingHorizontal: space.s14,
                paddingVertical: space.s10,
              }}
            >
              <Text variant="body" color={m.from === 'you' ? colors.bg : colors.ink}>
                {m.text}
              </Text>
            </View>
          ))}
          {thinking ? (
            <Text variant="footnote" color={colors.ink45}>
              Thinking…
            </Text>
          ) : null}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s8, paddingVertical: space.s8 }} style={{ flexGrow: 0 }}>
          {SUGGESTIONS.map((s) => (
            <Press key={s} onPress={() => send(s)} style={{ paddingHorizontal: space.s14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: colors.control }}>
              <Text variant="control">{s}</Text>
            </Press>
          ))}
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.s8,
            backgroundColor: colors.inputBg,
            borderRadius: radius.sheet,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            paddingLeft: space.s16,
            paddingRight: space.s6,
            marginBottom: space.s8,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask your agent"
            placeholderTextColor={colors.ink38}
            style={{ flex: 1, color: colors.ink, fontSize: 15, height: 48 }}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <IconButton name="send" accessibilityLabel="Send" onPress={() => send()} background={colors.ink} color={colors.bg} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
