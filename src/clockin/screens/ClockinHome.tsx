/**
 * Home, in the CLOCK IN build — xorr's Home (the xorr-xlayer design: header, total balance, the live line, the sheet of
 * Agents / Brief / Stocks / SKR with the ARMED chip), reading Solana devnet instead of the hosted executor.
 *
 * The daily clock-in sits where xorr's setup card sits: under the balance, before the sheet. One signature keeps the
 * streak and pays SKR; the agent takes its look right after, and the Brief tab says what it did.
 */
import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/design/Icon';
import {
  AgentOrb,
  Button,
  IconButton,
  Press,
  Row,
  Screen,
  Text,
  colors,
  money,
  radius,
  size,
  space,
  typeScale,
} from '@/ui';
import { Eyebrow } from '@/ui/Eyebrow';
import { RollingNumber } from '@/ui/RollingNumber';
import { Rise } from '@/ui/Rise';
import { STAGGER } from '@/ui/motion';
import { heavyTap, selectionTick, successTap, warningTap } from '@/ui/haptics';
import { CLOCKIN_AGENTS } from '../agents';
import { STOCKS } from '../config';
import { checkIn, ensureDesk, feeMode, friendlyError, getDevnetSol, useLive, type CheckInResult } from '../desk';
import { driftPct, nasdaqOpen } from '../engine';
import { useAutopilot, useScrollAutopilot } from '../autopilot';
import { useClockin } from '../session';
import { checkInReward, checkedInToday, currentStreak, streakAfterCheckIn } from '../streak';
import { STRATEGY_INFO, nextTier, rewardMultiplier } from '../tiers';
import { useDesk } from '../useDesk';
import { Banner, DevnetPill, SKR_GOLD, TokenMark, TxLink, WeekStrip, signedPct, usd, whole } from '../ui';

const AVATAR = 40;
const GRABBER_W = 36;
const GRABBER_H = 4;
const TAB_RULE = 2;
const ORB = 56 as const;
const TILE_W = '25%' as const;
const DOT = 8;

type SheetTab = 'agents' | 'brief' | 'stocks' | 'skr';
const TABS: { key: SheetTab; label: string }[] = [
  { key: 'agents', label: 'Agents' },
  { key: 'brief', label: 'Brief' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'skr', label: 'SKR' },
];

export default function ClockinHome() {
  const router = useRouter();
  const { owner, live, st, plan, pulling, onPull } = useDesk();
  const scroller = useScrollAutopilot();
  const streakState = useClockin((s) => s.streak);
  const activity = useClockin((s) => s.activity);
  const [tab, setTab] = useState<SheetTab>('agents');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = checkedInToday(streakState);
  const streak = currentStreak(streakState);
  const nextReward = checkInReward(done ? streak + 1 : streakAfterCheckIn(streakState), rewardMultiplier(st.tier, st.seeker));
  const busy = live.busy;
  const perm = st.permission;
  const total = live.view ? st.cashUsd + st.bookValue : null;
  const lastPermissionEvent = activity.find((a) => a.kind === 'grant' || a.kind === 'revoke')?.kind;
  const todaysSig = result?.sig ?? activity.find((a) => a.kind === 'checkin')?.sig;
  const brief = result ? result.brief : plan.brief;

  const title = owner?.kind === 'guest' ? 'Guest wallet' : (owner?.label ?? 'Wallet');
  const subtitle = owner ? `${owner.address.slice(0, 4)}…${owner.address.slice(-4)}` : '';
  const initial = (owner?.kind === 'mwa' ? 'S' : owner?.kind === 'privy' ? 'P' : 'G').toUpperCase();

  // The live line, as xorr's TradingTicker words it.
  const line = perm.live
    ? `Your agent is working · ${usd(perm.leftUsd, 0)} left to spend`
    : lastPermissionEvent === 'grant'
      ? 'Your agent spent its allowance · grant more to keep it trading'
      : lastPermissionEvent === 'revoke'
        ? 'Trading is stopped · you revoked the permission'
        : 'No agent is trading right now';

  // The ARMED chip, from the chain.
  const chip = perm.live ? { label: 'Armed', tone: colors.up } : { label: 'Off', tone: colors.ink30 };

  async function onClockIn() {
    if (!owner) return;
    setError(null);
    heavyTap();
    try {
      const r = await checkIn(owner);
      successTap();
      setResult(r);
      setTab('brief');
    } catch (e) {
      warningTap();
      setError(friendlyError(e));
    }
  }

  useAutopilot(
    {
      checkin: onClockIn,
      'tab-agents': () => setTab('agents'),
      'tab-brief': () => setTab('brief'),
      'tab-stocks': () => setTab('stocks'),
      'tab-skr': () => setTab('skr'),
    },
    !!owner && !!live.view && !!live.prices,
  );

  function openTab(t: SheetTab) {
    selectionTick();
    setTab(t);
  }

  return (
    <Screen tabBar gutter="none">
      <Rise index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingHorizontal: space.gutter }}>
        <Press
          onPress={() => router.push('/me')}
          accessibilityRole="button"
          accessibilityLabel={`Your profile, ${title}`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.s12 }}
        >
          <View
            style={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: AVATAR / 2,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="rowPrimary" color={colors.sheet.ink}>
              {initial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="rowPrimary" numberOfLines={1}>
              {title}
            </Text>
            <Text variant="secondarySm" color={colors.ink55} numberOfLines={1} style={{ marginTop: space.s2 }}>
              {subtitle}
            </Text>
          </View>
        </Press>
        <DevnetPill />
        <IconButton name="bell" accessibilityLabel="Morning brief and settings" onPress={() => router.push('/me')} />
      </Rise>

      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={colors.ink55} />}
      >
        <Rise index={1} style={{ marginTop: space.s26, paddingHorizontal: space.gutter }}>
          <Press
            onPress={() => openTab('stocks')}
            accessibilityRole="button"
            accessibilityLabel="Total balance. Shows your stocks."
            hitHeight={typeScale.eyebrow.lineHeight}
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.s6 }}
          >
            <Eyebrow>Total balance</Eyebrow>
            <Icon name="chevron" size={11} color={colors.ink40} />
          </Press>
          {total !== null ? (
            <RollingNumber value={money(total)} variant="heroBalance" delay={STAGGER} roll containerStyle={{ marginTop: space.s6 }} />
          ) : (
            <Text variant="heroBalance" style={{ marginTop: space.s6 }}>
              —
            </Text>
          )}
          <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s4 }}>
            Devnet test money · stand-ins at live xStock prices
          </Text>
        </Rise>

        <Rise index={2} style={{ marginTop: space.s12, paddingHorizontal: space.gutter }}>
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={line}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.s8,
              paddingHorizontal: space.s12,
              paddingVertical: space.s8,
              borderRadius: radius.card,
              backgroundColor: colors.surfaceAlt,
            }}
          >
            <View style={{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: perm.live ? colors.up : colors.ink30 }} />
            <Text variant="footnote" color={perm.live ? colors.ink65 : colors.ink45} numberOfLines={1} style={{ flex: 1 }}>
              {line}
            </Text>
          </View>
        </Rise>

        {live.error ? (
          <View style={{ marginTop: space.s12, paddingHorizontal: space.gutter, gap: space.s8 }}>
            <Banner text={live.error} />
            {live.setupFailed ? (
              <Button
                label={busy ?? 'Try setting up again'}
                loading={!!busy}
                variant="secondary"
                onPress={() => {
                  if (owner) void ensureDesk(owner).catch((e) => useLive.setState({ error: friendlyError(e), setupFailed: true }));
                }}
                testID="retry-setup"
              />
            ) : null}
          </View>
        ) : null}

        {live.view && feeMode(live.view) === 'self' && live.view.sol < 0.003 ? (
          <View style={{ marginTop: space.s12, paddingHorizontal: space.gutter, gap: space.s8 }}>
            <Banner text="xorr’s devnet faucet is out of SOL right now, so transactions need a little devnet SOL of your own (free, test only)." />
            <Button
              label={busy === 'Requesting devnet SOL' ? 'Requesting…' : 'Get devnet SOL'}
              variant="secondary"
              loading={busy === 'Requesting devnet SOL'}
              onPress={() => {
                if (owner) void getDevnetSol(owner).catch((e) => setError(friendlyError(e)));
              }}
            />
          </View>
        ) : null}

        {/* The daily clock-in, where xorr's setup card sits. */}
        <Rise index={2} style={{ marginTop: space.s16, paddingHorizontal: space.gutter }}>
          <View
            testID="clock-in"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.panel,
              borderWidth: 1,
              borderColor: done ? colors.cardBorder : 'rgba(245,206,95,0.32)',
              padding: space.s16,
              gap: space.s14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text variant="eyebrowSm" color={SKR_GOLD}>
                  Daily clock-in
                </Text>
                <Text variant="cardTitleLg" style={{ marginTop: space.s4 }}>
                  {streak > 0 ? `${streak}-day streak` : 'Start a streak'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="value" color={SKR_GOLD}>
                  +{nextReward} dSKR
                </Text>
                <Text variant="footnoteSm" color={colors.ink45}>
                  {done ? 'tomorrow' : 'today'}
                  {st.seeker ? ' · Seeker 1.5×' : ''}
                </Text>
              </View>
            </View>
            <WeekStrip streak={streakState} />
            {error ? <Banner text={error} tone="warn" /> : null}
            {done ? (
              <View style={{ gap: space.s2 }}>
                <Text variant="footnote" color={colors.ink55}>
                  Clocked in today. Your streak is safe until tomorrow night (UTC).
                </Text>
                <TxLink sig={todaysSig} label="Today’s clock-in on chain" />
              </View>
            ) : (
              <Button
                label={busy ? busy : `Clock in · +${nextReward} dSKR`}
                loading={!!busy}
                onPress={onClockIn}
                backgroundColor={SKR_GOLD}
                color={colors.goldInk}
                testID="clock-in-button"
              />
            )}
          </View>
        </Rise>

        {/* The sheet. */}
        <Rise
          index={3}
          style={{
            flexGrow: 1,
            marginTop: space.s26,
            paddingTop: space.s10,
            paddingBottom: space.s26,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <View style={{ alignSelf: 'center', width: GRABBER_W, height: GRABBER_H, borderRadius: GRABBER_H / 2, backgroundColor: colors.ink28 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.s14, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ gap: space.s22, paddingLeft: space.gutter, paddingRight: space.s14 }}
            >
              {TABS.map((t) => {
                const selected = t.key === tab;
                return (
                  <Press
                    key={t.key}
                    onPress={() => openTab(t.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t.label}
                    testID={`home-tab-${t.key}`}
                    style={{ paddingBottom: space.s10, borderBottomWidth: TAB_RULE, borderBottomColor: selected ? colors.ink : colors.surfaceAlt }}
                  >
                    <Text variant="cardTitle" color={selected ? colors.ink : colors.ink40}>
                      {t.label}
                    </Text>
                  </Press>
                );
              })}
            </ScrollView>
            <Press
              onPress={() => router.push('/desk')}
              accessibilityRole="button"
              accessibilityLabel={`${perm.live ? 'Armed' : 'Off'}. Open your agent's permission.`}
              style={{ marginLeft: 'auto', paddingBottom: space.s10, paddingRight: space.gutter }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.s8,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.card,
                  paddingHorizontal: space.s12,
                  paddingVertical: space.s6,
                }}
              >
                <View style={{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: chip.tone }} />
                <Text variant="tag" color={colors.ink}>
                  {chip.label.toUpperCase()}
                </Text>
              </View>
            </Press>
          </View>

          <View style={{ flexGrow: 1, paddingHorizontal: space.gutter, marginTop: space.s4 }}>
            {tab === 'agents' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.s18, marginTop: space.s18 }}>
                {CLOCKIN_AGENTS.map((a) => {
                  const on = st.strategies.includes(a.id);
                  const status = on ? (perm.live ? 'Working' : 'Hired') : 'Not hired';
                  return (
                    <View key={a.id} style={{ width: TILE_W }}>
                      <Press
                        onPress={() => router.push('/desk')}
                        accessibilityRole="button"
                        accessibilityLabel={`${a.name}, ${status}. ${a.role}`}
                        style={{ alignItems: 'center', gap: space.s8, paddingHorizontal: space.s4 }}
                      >
                        <AgentOrb gradient={a.gradient} size={ORB} face />
                        <Text variant="orbName" align="center" numberOfLines={2} style={{ minHeight: typeScale.orbName.lineHeight * 2 }}>
                          {a.name}
                        </Text>
                        <Text variant="orbStatus" color={on ? colors.ink55 : colors.ink30}>
                          {status}
                        </Text>
                      </Press>
                    </View>
                  );
                })}
                <View style={{ width: TILE_W }}>
                  <Press
                    onPress={() => router.push('/skr')}
                    accessibilityRole="button"
                    accessibilityLabel="Hire a shift with SKR"
                    style={{ alignItems: 'center', gap: space.s8, paddingHorizontal: space.s4 }}
                  >
                    <View
                      style={{
                        width: ORB,
                        height: ORB,
                        borderRadius: ORB / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: colors.ink28,
                      }}
                    >
                      <Icon name="plus" size={26} color={colors.ink55} strokeWidth={2} />
                    </View>
                    <Text variant="orbName" align="center" numberOfLines={2} style={{ minHeight: typeScale.orbName.lineHeight * 2 }}>
                      Hire a shift
                    </Text>
                    <Text variant="orbStatus" color={colors.ink30}>
                      Pay in SKR
                    </Text>
                  </Press>
                </View>
              </View>
            ) : tab === 'brief' ? (
              <View style={{ marginTop: space.s18, gap: space.s12 }} testID="agent-brief">
                <View style={{ flexDirection: 'row', gap: space.s12, alignItems: 'center' }}>
                  <AgentOrb gradient={colors.agent.momentum} size={52} face />
                  <Text variant="cardTitleLg" style={{ flex: 1 }}>
                    {brief.headline}
                  </Text>
                </View>
                {brief.lines.map((l, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: space.s8 }}>
                    <Text variant="bodySm" color={colors.ink38}>
                      ›
                    </Text>
                    <Text variant="bodySm" color={colors.ink70} style={{ flex: 1 }}>
                      {l}
                    </Text>
                  </View>
                ))}
                {result?.trades.some((t) => t.decision.action !== 'hold') ? (
                  <View style={{ gap: space.s6, marginTop: space.s4 }}>
                    <Eyebrow>What it did just now</Eyebrow>
                    {result.trades
                      .filter((t) => t.decision.action !== 'hold')
                      .map((t, i) => (
                        <View key={i}>
                          <Text variant="bodySm" color={t.error ? colors.down : colors.ink}>
                            {t.decision.action === 'buy' ? `Bought $${t.decision.usd?.toFixed(2)} of ${t.decision.symbol}` : `Sold ${t.decision.symbol}`}
                            {t.error ? ` — refused: ${t.error}` : ` — ${t.decision.reason}`}
                          </Text>
                          <TxLink sig={t.sig} />
                        </View>
                      ))}
                  </View>
                ) : null}
                <Text variant="footnoteSm" color={colors.ink32}>
                  Written by your agent from live Jupiter prices · running {st.strategies.map((s) => STRATEGY_INFO[s].name).join(', ')}
                </Text>
                <Button label="Ask your agent" variant="ghost" onPress={() => router.push('/ask')} />
              </View>
            ) : tab === 'stocks' ? (
              <View style={{ marginTop: space.s6 }}>
                {Object.values(st.holdings).map((h, i, all) => {
                  const def = STOCKS.find((s) => s.symbol === h.symbol)!;
                  const q = live.prices?.quotes[h.symbol];
                  const value = h.qty * (q?.usd ?? 0);
                  const p = h.cost > 0 ? ((value - h.cost) / h.cost) * 100 : 0;
                  return (
                    <Row
                      key={`h-${h.symbol}`}
                      height={size.rowLg}
                      divider={i < all.length - 1}
                      left={<TokenMark symbol={h.symbol} c1={def.c1} c2={def.c2} />}
                      title={h.symbol}
                      secondary={`${h.qty.toFixed(4)} · avg ${usd(h.qty > 0 ? h.cost / h.qty : 0)}`}
                      value={usd(value)}
                      figure="own"
                      delta={signedPct(p)}
                      deltaTone={p > 0 ? 'up' : p < 0 ? 'down' : 'neutral'}
                    />
                  );
                })}
                <Row
                  height={size.rowLg}
                  divider
                  left={<TokenMark symbol="USDC" c1="#2775CA" c2="#1A4F8A" />}
                  title="dUSDC"
                  secondary="Devnet stand-in for USDC · cash"
                  value={usd(st.cashUsd)}
                  figure="own"
                />
                <Text variant="eyebrow" color={colors.ink45} style={{ marginTop: space.s18, marginBottom: space.s4 }}>
                  {nasdaqOpen(new Date()) ? 'Watching · Nasdaq open' : 'Watching · Nasdaq shut'}
                </Text>
                {STOCKS.map((s, i) => {
                  const q = live.prices?.quotes[s.symbol];
                  const d = q ? driftPct(q) : null;
                  return (
                    <Row
                      key={s.symbol}
                      height={size.rowLg}
                      divider={i < STOCKS.length - 1}
                      left={<TokenMark symbol={s.symbol} c1={s.c1} c2={s.c2} />}
                      title={s.symbol}
                      secondary={d === null ? s.name : `${s.name} · pool ${signedPct(d)} vs issuer`}
                      value={q ? usd(q.usd) : '—'}
                      figure="market"
                      delta={q?.change24h != null ? signedPct(q.change24h) : undefined}
                      deltaTone={q?.change24h == null || q.change24h === 0 ? 'neutral' : q.change24h > 0 ? 'up' : 'down'}
                    />
                  );
                })}
              </View>
            ) : (
              <View style={{ marginTop: space.s6 }}>
                <Row
                  height={size.rowLg}
                  divider
                  left={<TokenMark symbol="SKR" c1={colors.goldFill} c2="#C98518" />}
                  title={`${st.tier.name} tier`}
                  secondary={st.tier.perk}
                  value={`${whole(st.source.skr)} SKR`}
                  onPress={() => router.push('/skr')}
                />
                <Row
                  height={size.rowLg}
                  divider
                  title="dSKR held"
                  secondary="Devnet stand-in for SKR · earned by clocking in"
                  value={whole(st.skrHeld)}
                  figure="own"
                />
                <Row
                  height={size.rowLg}
                  divider
                  title="SKR on mainnet"
                  secondary="Read only, never moved · counts toward your tier"
                  value={live.mainnetSkr == null ? '—' : whole(live.mainnetSkr)}
                />
                <Row
                  height={size.rowLg}
                  title="Seeker Genesis Token"
                  secondary={live.sgt ? 'Verified · 1.5× every clock-in' : 'Not in this wallet · Seekers earn 1.5×'}
                  value={live.sgt ? 'Seeker' : '—'}
                />
                <Button
                  label={(() => {
                    const n = nextTier(st.source.skr);
                    return n ? `${whole(n.needed)} SKR to ${n.tier.name} · earn, spend, hold` : 'Earn, spend, hold';
                  })()}
                  variant="ghost"
                  onPress={() => router.push('/skr')}
                  style={{ marginTop: space.s16 }}
                />
              </View>
            )}
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}
