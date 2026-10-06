/**
 * SKR — earned by showing up, spent on the agent's shifts, held for a tier. And a Seeker gets more.
 *
 * Real SKR on mainnet is READ (never moved) and counts toward the tier on day one; the devnet stand-in, dSKR, is what
 * the clock-in pays and what shifts cost. The Seeker Genesis Token, if the wallet holds one, adds half again to every
 * clock-in reward.
 */
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text, colors, radius, space } from '@/ui';
import { successTap, warningTap } from '@/ui/haptics';
import { DEVNET, SKR_MAINNET_MINT, STARTER_SKR } from '@/clockin/config';
import { claimStarterSkr } from '@/clockin/desk';
import { useClockin } from '@/clockin/session';
import { checkInReward } from '@/clockin/streak';
import { SHIFT_PRICE, STRATEGY_INFO, TIERS, nextTier, rewardMultiplier, type StrategyId } from '@/clockin/tiers';
import { useDesk } from '@/clockin/useDesk';
import { useScrollAutopilot } from '@/clockin/autopilot';
import { AddressLink, Banner, Card, DevnetPill, Eyebrow, SKR_GOLD, whole } from '@/clockin/ui';

export default function Skr() {
  const router = useRouter();
  const { owner, live, st, pulling, onPull } = useDesk();
  const scroller = useScrollAutopilot();
  const starter = useClockin((s) => s.starterSkr);
  const [err, setErr] = React.useState<string | null>(null);
  const next = nextTier(st.source.skr);
  const skrUsd = live.prices?.skrUsd ?? null;
  const mult = rewardMultiplier(st.tier, st.seeker);
  const progress = next ? Math.min(1, (st.source.skr - st.tier.min) / (next.tier.min - st.tier.min)) : 1;

  return (
    <Screen gutter="none">
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.s44, gap: space.s16 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={colors.ink55} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.s8 }}>
          <Text variant="screenTitle">SKR</Text>
          <DevnetPill />
        </View>

        {/* Tier. */}
        <Card testID="tier" style={{ borderColor: 'rgba(245,206,95,0.35)' }}>
          <Eyebrow color={SKR_GOLD}>Your tier</Eyebrow>
          <Text variant="priceSm" color={SKR_GOLD}>
            {st.tier.name}
          </Text>
          <Text variant="bodySm" color={colors.ink70} style={{ marginTop: space.s4 }}>
            {st.tier.perk}
          </Text>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.control, marginTop: space.s16, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: SKR_GOLD }} />
          </View>
          <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s8 }}>
            {next ? `${whole(next.needed)} more SKR held for ${next.tier.name}` : 'Top tier.'} · counting{' '}
            {st.source.source === 'mainnet' ? 'your real SKR on mainnet' : 'your dSKR on devnet'} ({whole(st.source.skr)})
          </Text>
        </Card>

        {/* Balances. */}
        <Card>
          <Eyebrow>What you hold</Eyebrow>
          <View style={{ flexDirection: 'row', gap: space.s12 }}>
            <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.tile, padding: space.s14 }}>
              <Text variant="eyebrowSm" color={colors.ink45}>
                dSKR · devnet stand-in
              </Text>
              <Text variant="amountMd" style={{ marginTop: space.s6 }}>
                {whole(st.skrHeld)}
              </Text>
              <AddressLink address={DEVNET.skrMint} label="stand-in mint" />
            </View>
            <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.tile, padding: space.s14 }}>
              <Text variant="eyebrowSm" color={colors.ink45}>
                SKR · mainnet, read-only
              </Text>
              <Text variant="amountMd" style={{ marginTop: space.s6 }}>
                {live.mainnetSkr == null ? '—' : whole(live.mainnetSkr)}
              </Text>
              <Text variant="footnoteSm" color={colors.ink38}>
                {live.mainnetSkr == null ? 'not read' : skrUsd ? `≈ $${(live.mainnetSkr * skrUsd).toFixed(2)}` : 'never moved'}
              </Text>
            </View>
          </View>
          <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s10 }}>
            Real SKR ({SKR_MAINNET_MINT.slice(0, 4)}…{SKR_MAINNET_MINT.slice(-4)}) is only read from mainnet, never moved: if
            you already hold it, your tier starts there.{skrUsd ? ` SKR is $${skrUsd.toFixed(4)} on Jupiter right now.` : ''}
          </Text>
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
                  setErr((e as Error).message);
                }
              }}
              style={{ marginTop: space.s12 }}
            />
          ) : null}
          {err ? <Banner text={err} tone="down" /> : null}
        </Card>

        {/* Seeker. */}
        <Card testID="seeker">
          <Eyebrow>Seeker Genesis Token</Eyebrow>
          {live.sgt ? (
            <>
              <Text variant="cardTitleLg" color={colors.up}>
                Seeker verified · 1.5× clock-in rewards
              </Text>
              <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s4 }}>
                Genesis Token {live.sgt.slice(0, 4)}…{live.sgt.slice(-4)} found in this wallet on mainnet (read-only).
              </Text>
            </>
          ) : (
            <>
              <Text variant="cardTitle">{live.sgt === undefined ? 'Checking…' : 'No Genesis Token in this wallet'}</Text>
              <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s4 }}>
                Connect a Seeker’s Seed Vault wallet: its Genesis Token (mainnet, read-only) adds 1.5× to every clock-in.
              </Text>
            </>
          )}
        </Card>

        {/* Earn. */}
        <Card>
          <Eyebrow color={SKR_GOLD}>Earn · clock in daily</Eyebrow>
          {[1, 3, 7, 9].map((d) => (
            <View key={d} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.s6 }}>
              <Text variant="bodySm" color={colors.ink70}>
                Day {d}
                {d === 9 ? '+' : ''} of a streak
              </Text>
              <Text variant="value" color={SKR_GOLD}>
                +{checkInReward(d, mult)} dSKR
              </Text>
            </View>
          ))}
          <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s6 }}>
            Base 10, +5 per streak day (to +40), × {st.tier.rewardX} for {st.tier.name}
            {st.seeker ? ' × 1.5 for Seeker' : ''}. Miss a day and the streak starts again.
          </Text>
        </Card>

        {/* Spend. */}
        <Card>
          <Eyebrow color={SKR_GOLD}>Spend · hire your agent’s shifts</Eyebrow>
          {(Object.keys(SHIFT_PRICE) as StrategyId[])
            .filter((id) => SHIFT_PRICE[id] > 0)
            .map((id) => (
              <View key={id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.s6 }}>
                <Text variant="bodySm" color={colors.ink70}>
                  {STRATEGY_INFO[id].name} · 24h
                </Text>
                <Text variant="value">{SHIFT_PRICE[id]} dSKR</Text>
              </View>
            ))}
          <Button label="Open the agent's strategies" variant="secondary" onPress={() => router.navigate('/desk')} style={{ marginTop: space.s10 }} />
        </Card>

        {/* Hold. */}
        <Card>
          <Eyebrow color={SKR_GOLD}>Hold · tiers</Eyebrow>
          {TIERS.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s8, opacity: t.id === st.tier.id ? 1 : 0.6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.id === st.tier.id ? SKR_GOLD : colors.switchOff }} />
              <Text variant="rowPrimary" style={{ width: 64 }}>
                {t.name}
              </Text>
              <Text variant="footnote" color={colors.ink55} style={{ flex: 1 }}>
                {t.min ? `${whole(t.min)}+ SKR · ` : ''}
                {t.perk}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
