/**
 * SKR (CLOCK IN build) — earned by clocking in, spent on the agent's shifts, held for a tier; a Seeker earns more. In
 * xorr's own vocabulary: the tier as a title over the limits meter, values in ink, Rows under `Eyebrow small`, the token
 * drawn with its logo. One gold Tag, for the Seeker perk, is the only colour that is SKR's own.
 *
 * Real SKR on mainnet is read, never moved, and counts toward the tier on day one. The devnet stand-in, dSKR, is what
 * the clock-in pays and what a shift costs.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/nav/useGoBack';
import { Icon } from '@/design/Icon';
import { price, quantity, BackButton, Button, Eyebrow, Fill, Row, Screen, StatRow, Tag, Text, colors, radius, size, space } from '@/ui';
import { FailureNote } from '@/ui/States';
import { successTap, warningTap } from '@/ui/haptics';
import { useScrollAutopilot } from '@/clockin/autopilot';
import { DEVNET, SKR_MAINNET_MINT, STARTER_SKR, explorerAddress } from '@/clockin/config';
import { CLOCKIN_AGENTS } from '@/clockin/agents';
import { claimStarterSkr, friendlyError } from '@/clockin/desk';
import { useClockin } from '@/clockin/session';
import { checkInReward, currentStreak } from '@/clockin/streak';
import { SHIFT_PRICE, TIERS, nextTier, rewardMultiplier } from '@/clockin/tiers';
import { useDesk } from '@/clockin/useDesk';
import { TokenMark, openUrl, whole } from '@/clockin/ui';

const BAR_H = 8;

export default function Skr() {
  const goBack = useGoBack('/');
  const router = useRouter();
  const { owner, live, st } = useDesk();
  const scroller = useScrollAutopilot();
  const starter = useClockin((s) => s.starterSkr);
  const streakState = useClockin((s) => s.streak);
  const [err, setErr] = React.useState<unknown>(null);
  const next = nextTier(st.source.skr);
  const skrUsd = live.prices?.skrUsd ?? null;
  const mult = rewardMultiplier(st.tier, st.seeker);
  const progress = next ? Math.min(1, (st.source.skr - st.tier.min) / (next.tier.min - st.tier.min)) : 1;
  const shifts = CLOCKIN_AGENTS.filter((a) => SHIFT_PRICE[a.id] > 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s8 }}>
        <BackButton onPress={() => goBack()} />
        <Text variant="screenTitle">SKR</Text>
      </View>

      <Fill style={{ marginTop: space.s20 }}>
        <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.s30 }}>
          <Eyebrow>Your tier</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s10, marginTop: space.s6 }}>
            <Text variant="titleLg" accessibilityRole="header">
              {st.tier.name}
            </Text>
            {st.seeker ? <Tag label="Seeker 1.5×" small colors={{ bg: colors.goldBg, fg: colors.goldFill }} /> : null}
          </View>
          <Text variant="body" color={colors.ink55} style={{ marginTop: space.s4 }}>
            {st.tier.perk}
          </Text>
          <View style={{ height: BAR_H, borderRadius: BAR_H / 2, backgroundColor: colors.control, marginTop: space.s16, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: BAR_H / 2, backgroundColor: colors.ink }} />
          </View>
          <Text variant="footnote" color={colors.ink55} style={{ marginTop: space.s8 }}>
            {next ? `${whole(next.needed)} more SKR for ${next.tier.name}` : 'Top tier.'} · counting{' '}
            {st.source.source === 'mainnet' ? 'your real SKR on mainnet' : 'your dSKR on devnet'}
          </Text>

          <StatRow
            style={{ marginTop: space.s20 }}
            items={[
              { label: 'Streak', value: `${currentStreak(streakState)}d`, figure: 'market' },
              { label: 'Next clock-in', value: `+${checkInReward(currentStreak(streakState) + 1, mult)}`, figure: 'market' },
              { label: 'Fee on fills', value: `${quantity(st.tier.feeBps / 100, 2)}%`, figure: 'market' },
            ]}
          />

          <Eyebrow small style={{ marginTop: space.s26 }}>
            What you hold
          </Eyebrow>
          <Row
            height={size.rowLg}
            left={<TokenMark symbol="SKR" c1={colors.agent.earnings.c1} c2={colors.agent.earnings.c2} />}
            title="dSKR"
            secondary="Devnet stand-in for SKR"
            value={whole(st.skrHeld)}
            figure="own"
            onPress={() => openUrl(explorerAddress(DEVNET.skrMint))}
          />
          <Row
            height={size.rowLg}
            divider={false}
            left={<TokenMark symbol="SKR" c1={colors.agent.earnings.c1} c2={colors.agent.earnings.c2} />}
            title="SKR on mainnet"
            secondary={`Read only, never moved${skrUsd ? ` · ${price(skrUsd)}` : ''}`}
            value={live.mainnetSkr == null ? '—' : whole(live.mainnetSkr)}
            onPress={() => openUrl(`https://explorer.solana.com/address/${SKR_MAINNET_MINT}`)}
          />
          {!starter ? (
            <Button
              label={`Claim ${STARTER_SKR} dSKR welcome grant`}
              variant="ghost"
              loading={live.busy === 'Claiming starter SKR'}
              onPress={async () => {
                if (!owner) return;
                setErr(null);
                try {
                  await claimStarterSkr(owner);
                  successTap();
                } catch (e) {
                  warningTap();
                  setErr(new Error(friendlyError(e)));
                }
              }}
              style={{ marginTop: space.s10 }}
            />
          ) : null}
          {err ? <FailureNote error={err} style={{ marginTop: space.s10 }} /> : null}

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Seeker
          </Eyebrow>
          <Row
            height={size.rowLg}
            divider={false}
            title="Seeker Genesis Token"
            secondary={
              live.sgt
                ? `Verified, read from mainnet · ${live.sgt.slice(0, 4)}…${live.sgt.slice(-4)}`
                : live.sgt === undefined
                  ? 'Checking this wallet on mainnet…'
                  : 'Connect a Seeker’s Seed Vault wallet: its Genesis Token adds 1.5× to every clock-in'
            }
            value={live.sgt ? <Tag label="1.5×" small colors={{ bg: colors.goldBg, fg: colors.goldFill }} /> : '—'}
            testID="seeker"
          />

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Earn · clock in daily
          </Eyebrow>
          {[1, 3, 7, 9].map((d, i, all) => (
            <Row key={d} height={size.rowSm} divider={i < all.length - 1} title={`Day ${d}${d === 9 ? '+' : ''} of a streak`} value={`+${checkInReward(d, mult)} dSKR`} figure="market" />
          ))}
          <Text variant="footnote" color={colors.ink55} style={{ marginTop: space.s6 }}>
            {`Base 10, +5 per streak day (to +40), × ${st.tier.rewardX} for ${st.tier.name}${st.seeker ? ' × 1.5 for Seeker' : ''}. Miss a day and the streak starts again.`}
          </Text>

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Spend · hire a shift
          </Eyebrow>
          {shifts.map((a, i) => (
            <Row
              key={a.id}
              height={size.rowLg}
              divider={i < shifts.length - 1}
              title={a.name}
              secondary="24 hours on your agent’s next looks"
              value={`${SHIFT_PRICE[a.id]} SKR`}
              figure="market"
              onPress={() => router.push(`/agent/${a.id}`)}
              right={<Icon name="chevron" size={16} color={colors.ink28} />}
            />
          ))}

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Hold · tiers
          </Eyebrow>
          {TIERS.map((t, i) => (
            <Row
              key={t.id}
              height={size.rowLg}
              divider={i < TIERS.length - 1}
              title={t.name}
              secondary={t.perk}
              value={t.id === st.tier.id ? <Tag label="You" small /> : <Text variant="rowPrimary" color={colors.ink55}>{t.min ? `${whole(t.min)}+` : '0'}</Text>}
            />
          ))}
          <View style={{ height: space.s8, borderRadius: radius.full }} />
        </ScrollView>
      </Fill>
    </Screen>
  );
}
