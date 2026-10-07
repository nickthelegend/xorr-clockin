/**
 * SKR — earned by clocking in, spent on the agent's shifts, held for a tier; and a Seeker earns more (CLOCK IN build).
 *
 * Real SKR on mainnet is read, never moved, and counts toward the tier on day one. The devnet stand-in, dSKR, is what
 * the clock-in pays and what a shift costs. A Seeker Genesis Token in the wallet adds half again to every clock-in.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/nav/useGoBack';
import { BackButton, Button, Fill, Row, Screen, SheetCard, Text, colors, radius, size, space } from '@/ui';
import { successTap, warningTap } from '@/ui/haptics';
import { useScrollAutopilot } from '@/clockin/autopilot';
import { DEVNET, SKR_MAINNET_MINT, STARTER_SKR } from '@/clockin/config';
import { claimStarterSkr, friendlyError } from '@/clockin/desk';
import { useClockin } from '@/clockin/session';
import { checkInReward } from '@/clockin/streak';
import { SHIFT_PRICE, STRATEGY_INFO, TIERS, nextTier, rewardMultiplier, type StrategyId } from '@/clockin/tiers';
import { useDesk } from '@/clockin/useDesk';
import { AddressLink, Banner, Eyebrow, SKR_GOLD, TokenMark, whole } from '@/clockin/ui';

export default function Skr() {
  const goBack = useGoBack('/');
  const router = useRouter();
  const { owner, live, st } = useDesk();
  const scroller = useScrollAutopilot();
  const starter = useClockin((s) => s.starterSkr);
  const [err, setErr] = React.useState<string | null>(null);
  const next = nextTier(st.source.skr);
  const skrUsd = live.prices?.skrUsd ?? null;
  const mult = rewardMultiplier(st.tier, st.seeker);
  const progress = next ? Math.min(1, (st.source.skr - st.tier.min) / (next.tier.min - st.tier.min)) : 1;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s8 }}>
        <BackButton onPress={() => goBack()} />
        <Text variant="screenTitle">SKR</Text>
      </View>

      <Fill style={{ marginTop: space.s20 }}>
        <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.s30, gap: space.s12 }}>
          <View>
            <Text variant="eyebrow" color={colors.ink45}>
              Your tier
            </Text>
            <Text variant="heroBalance" color={SKR_GOLD} style={{ marginTop: space.s6 }}>
              {st.tier.name}
            </Text>
            <Text variant="body" color={colors.ink55} style={{ marginTop: space.s4 }}>
              {st.tier.perk}
            </Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.control, marginTop: space.s16, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(progress * 100)}%`, height: 6, backgroundColor: SKR_GOLD }} />
            </View>
            <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s8 }}>
              {next ? `${whole(next.needed)} more SKR held for ${next.tier.name}` : 'Top tier.'} · counting{' '}
              {st.source.source === 'mainnet' ? 'your real SKR on mainnet' : 'your dSKR on devnet'} ({whole(st.source.skr)})
            </Text>
          </View>

          <SheetCard borderRadius={radius.panel} padding={space.s16} testID="tier">
            <Row
              height={size.rowLg}
              divider
              left={<TokenMark symbol="SKR" c1={colors.goldFill} c2="#C98518" />}
              title="dSKR"
              secondary="Devnet stand-in for SKR"
              value={whole(st.skrHeld)}
              figure="own"
            />
            <Row
              height={size.rowLg}
              left={<TokenMark symbol="SKR" c1={colors.goldFill} c2="#C98518" />}
              title="SKR · mainnet"
              secondary={`Read only, never moved${skrUsd ? ` · $${skrUsd.toFixed(4)}` : ''}`}
              value={live.mainnetSkr == null ? '—' : whole(live.mainnetSkr)}
            />
            <View style={{ flexDirection: 'row', gap: space.s12, marginTop: space.s6 }}>
              <AddressLink address={DEVNET.skrMint} label="dSKR mint" />
              <AddressLink address={SKR_MAINNET_MINT} label="SKR mint" />
            </View>
            {!starter ? (
              <Button
                label={`Claim ${STARTER_SKR} dSKR welcome grant`}
                variant="secondary"
                loading={live.busy === 'Claiming starter SKR'}
                onPress={async () => {
                  if (!owner) return;
                  setErr(null);
                  try {
                    await claimStarterSkr(owner);
                    successTap();
                  } catch (e) {
                    warningTap();
                    setErr(friendlyError(e));
                  }
                }}
                style={{ marginTop: space.s12 }}
              />
            ) : null}
            {err ? <Banner text={err} tone="warn" /> : null}
          </SheetCard>

          <SheetCard borderRadius={radius.panel} padding={space.s16} testID="seeker">
            <Eyebrow>Seeker Genesis Token</Eyebrow>
            <Text variant="cardTitleLg" color={live.sgt ? colors.up : colors.ink}>
              {live.sgt ? 'Seeker verified · 1.5× clock-in rewards' : live.sgt === undefined ? 'Checking…' : 'No Genesis Token in this wallet'}
            </Text>
            <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s4 }}>
              {live.sgt
                ? `Genesis Token ${live.sgt.slice(0, 4)}…${live.sgt.slice(-4)}, read from mainnet.`
                : 'Connect a Seeker’s Seed Vault wallet: its Genesis Token (mainnet, read only) adds 1.5× to every clock-in.'}
            </Text>
          </SheetCard>

          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Eyebrow color={SKR_GOLD}>Earn · clock in daily</Eyebrow>
            {[1, 3, 7, 9].map((d, i, all) => (
              <Row key={d} height={size.rowSm} divider={i < all.length - 1} title={`Day ${d}${d === 9 ? '+' : ''} of a streak`} value={`+${checkInReward(d, mult)} dSKR`} />
            ))}
            <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s6 }}>
              Base 10, +5 per streak day (to +40), × {st.tier.rewardX} for {st.tier.name}
              {st.seeker ? ' × 1.5 for Seeker' : ''}. Miss a day and the streak starts again.
            </Text>
          </SheetCard>

          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Eyebrow color={SKR_GOLD}>Spend · hire your agent’s shifts</Eyebrow>
            {(Object.keys(SHIFT_PRICE) as StrategyId[])
              .filter((id) => SHIFT_PRICE[id] > 0)
              .map((id, i, all) => (
                <Row key={id} height={size.rowSm} divider={i < all.length - 1} title={`${STRATEGY_INFO[id].name} · 24h`} value={`${SHIFT_PRICE[id]} SKR`} />
              ))}
            <Button label="Hire one on Your agent" variant="secondary" onPress={() => router.push('/desk')} style={{ marginTop: space.s10 }} />
          </SheetCard>

          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Eyebrow color={SKR_GOLD}>Hold · tiers</Eyebrow>
            {TIERS.map((t, i) => (
              <Row
                key={t.id}
                height={size.row}
                divider={i < TIERS.length - 1}
                title={t.name}
                secondary={t.perk}
                value={t.min ? `${whole(t.min)}+` : '0'}
                style={{ opacity: t.id === st.tier.id ? 1 : 0.55 }}
              />
            ))}
          </SheetCard>
        </ScrollView>
      </Fill>
    </Screen>
  );
}
