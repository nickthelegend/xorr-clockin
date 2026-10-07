/**
 * An agent's page (CLOCK IN build) — xorr's agent page (`app/agent/[id].tsx` in xorr-xlayer): the orb, the name, its
 * role, the HIRED chip; the one action (hire a 24-hour shift for SKR, or nothing to do when the tier includes it); three
 * stats; and, on `surfaceAlt`, what this agent would do right now, stock by stock, with its reason.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { quantity, AgentOrb, BackButton, Button, ConsequenceCard, Press, Price, Row, Screen, Tag, Text, TransactionRef, colors, radius, size, space } from '@/ui';
import { Rise } from '@/ui/Rise';
import { selectionTick, successTap, warningTap } from '@/ui/haptics';
import { useGoBack } from '@/nav/useGoBack';
import { CLOCKIN_AGENTS } from '../agents';
import { useAutopilot } from '../autopilot';
import { explorerTx } from '../config';
import { agentLook, buyShift, friendlyError, type TradeResult } from '../desk';
import { useClockin } from '../session';
import { SHIFT_PRICE, TIERS, type StrategyId } from '../tiers';
import { useDesk } from '../useDesk';
import { usd, whole } from '../ui';

const ORB = 84 as const;

export default function ClockinAgent() {
  const goBack = useGoBack('/');
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const agent = CLOCKIN_AGENTS.find((a) => a.id === id);
  const { owner, live, st, plan } = useDesk();
  const passes = useClockin((s) => s.passes);
  const [result, setResult] = useState<{ sig: string } | null>(null);
  const [look, setLook] = useState<TradeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justHired, setJustHired] = useState(false);
  const busy = live.busy;

  const strategy = (agent?.id ?? 'momentum') as StrategyId;
  const included = st.tier.strategies.includes(strategy);
  const pass = passes[strategy];
  const passLive = !!pass && pass.until > (live.prices?.at ?? 0);
  const hired = included || passLive;
  const price = SHIFT_PRICE[strategy];
  const unlockTier = TIERS.find((t) => t.strategies.includes(strategy));

  async function hire() {
    if (!owner) return;
    selectionTick();
    setError(null);
    try {
      const sig = await buyShift(owner, strategy);
      successTap();
      setJustHired(true);
      setResult({ sig });
    } catch (e) {
      warningTap();
      setError(friendlyError(e));
    }
  }
  async function lookNow() {
    if (!owner) return;
    selectionTick();
    setError(null);
    try {
      setLook(await agentLook(owner));
      successTap();
    } catch (e) {
      warningTap();
      setError(friendlyError(e));
    }
  }
  useAutopilot({ hire, look: lookNow }, !!owner && !!live.view);

  if (!agent) {
    return (
      <Screen>
        <BackButton onPress={() => goBack()} />
        <Text variant="body" color={colors.ink55} style={{ marginTop: space.s16 }}>
          Agent not found.
        </Text>
      </Screen>
    );
  }

  const rows = (look ?? plan.decisions.map((decision) => ({ decision }) as TradeResult)).filter(
    (r) => r.decision.strategy === strategy || r.decision.action === 'hold' || r.decision.strategy === 'exit',
  );

  return (
    <Screen gutter="none">
      <View style={{ paddingHorizontal: space.gutter }}>
        <BackButton onPress={() => goBack()} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.s30, gap: space.s14 }}>
        <Rise index={0} style={{ alignItems: 'center', gap: space.s8 }}>
          <AgentOrb gradient={agent.gradient} identity={agent.name} size={ORB} face stage={busy === 'Paying the shift' ? 'executing' : justHired ? 'filled' : undefined} />
          <Text variant="screenTitle" align="center" style={{ marginTop: space.s6 }} accessibilityRole="header">
            {agent.name}
          </Text>
          <Text variant="secondarySm" color={colors.ink55} align="center">
            {agent.role}
          </Text>
          <View style={{ marginTop: space.s4, paddingHorizontal: space.s10, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: hired ? colors.control : colors.neutralBg }}>
            <Text variant="chipSm" color={hired ? colors.ink : colors.ink55}>
              {hired ? 'HIRED' : 'NOT HIRED'}
            </Text>
          </View>
        </Rise>

        <Rise index={1} style={{ gap: space.s8 }}>
          {included ? (
            <Text variant="secondarySm" color={colors.ink55} align="center">
              Included in your {st.tier.name} tier.
            </Text>
          ) : passLive ? (
            <Text variant="secondarySm" color={colors.ink55} align="center">
              {`On shift until ${new Date(pass!.until).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.`}
            </Text>
          ) : (
            <>
              <Button label={busy === 'Paying the shift' ? 'Paying…' : `Hire for 24h · ${price} SKR`} loading={busy === 'Paying the shift'} disabled={!!busy} onPress={hire} testID="hire-shift" />
              <Text variant="secondarySm" color={colors.ink55} align="center">
                {`You hold ${whole(st.skrHeld)} dSKR, the devnet stand-in for SKR.${unlockTier ? ` ${unlockTier.name} includes it.` : ''}`}
              </Text>
            </>
          )}
          {error ? (
            <Text variant="secondarySm" color={colors.down} align="center" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          {result ? (
            <View style={{ gap: space.s4 }}>
              <ConsequenceCard tone="up" label={`${agent.name} is on shift for 24 hours`} detail={`Paid ${price} dSKR. It joins your agent’s next look.`} />
              <View style={{ alignSelf: 'flex-end' }}>
                <TransactionRef explorer={explorerTx(result.sig)} />
              </View>
            </View>
          ) : null}
        </Rise>

        <Rise index={2} style={{ flexDirection: 'row', gap: space.s10 }}>
          <Stat label="Shift" value={price ? `${price} SKR` : 'Free'} />
          <Stat label="Fee on fills" value={`${quantity(st.tier.feeBps / 100, 2)}%`} />
          {st.permission.live ? (
            <Stat label="Left to spend" value={usd(st.permission.leftUsd, 0)} />
          ) : (
            <Stat label="Set one in Safety ›" value="No permission yet" onPress={() => router.push('/desk')} />
          )}
        </Rise>

        <Rise index={3} style={{ borderRadius: radius.panel, backgroundColor: colors.surfaceAlt, padding: space.s16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="cardTitle">{look ? 'What it just did' : 'What it would do now'}</Text>
          </View>
          {rows.slice(0, 6).map((r, i, all) => (
            <Row
              key={`${r.decision.symbol}-${i}`}
              height={size.rowLg}
              divider={i < all.length - 1}
              title={`${r.decision.symbol}${r.decision.usd ? ` · ${usd(r.decision.usd)}` : ''}`}
              secondary={r.error ?? r.decision.reason}
              right={
                r.sig ? (
                  <TransactionRef explorer={explorerTx(r.sig)} />
                ) : (
                  <Tag label={r.decision.action} tone={r.error ? 'down' : r.decision.action === 'hold' ? 'neutral' : 'up'} small />
                )
              }
            />
          ))}
          <View style={{ marginTop: space.s14 }}>
            <Button
              label={busy === 'Agent is looking' ? 'Looking…' : 'Look now'}
              variant="ghost"
              loading={busy === 'Agent is looking'}
              disabled={!!busy || !st.permission.live}
              onPress={lookNow}
              testID="look-now"
            />
            {!st.permission.live ? (
              <Button label="Give your agent a permission" variant="ghost" onPress={() => router.push('/desk')} style={{ marginTop: space.s8 }} />
            ) : null}
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const tile = { flex: 1, paddingVertical: space.s14, paddingHorizontal: space.s12, borderRadius: radius.card, backgroundColor: colors.surfaceAlt } as const;
  // A sentence instead of a figure — "No permission yet" — reads as words, wraps to two lines, and leads somewhere.
  if (onPress) {
    return (
      <Press onPress={onPress} accessibilityRole="link" accessibilityLabel={`${value}. ${label.replace(' ›', '')}`} style={tile}>
        <Text variant="rowPrimary" numberOfLines={2}>
          {value}
        </Text>
        <Text variant="footnote" color={colors.ink55} style={{ marginTop: space.s4 }}>
          {label}
        </Text>
      </Press>
    );
  }
  return (
    <View style={tile}>
      <Price variant="cardTitleLg" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} figure="market">
        {value}
      </Price>
      <Text variant="footnote" color={colors.ink55} style={{ marginTop: space.s4 }}>
        {label}
      </Text>
    </View>
  );
}
