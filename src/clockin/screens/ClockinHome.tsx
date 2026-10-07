/**
 * Home, in the CLOCK IN build — xorr's Home, exactly as xorr-xlayer lays it out: the header (avatar, name, a quiet
 * subtitle, the bell), the total balance, at most one card (here: the day's clock-in, in the shape of xorr's SetupCard),
 * the ticker line, and the sheet of tabs with the ARMED chip. It reads Solana devnet instead of the hosted executor.
 *
 * The clock-in is a SetupCard row of the last seven days — a quiet tick for a day done, a ring for today, a dash for a
 * day missed — with one white button. Once you have clocked in the card goes away and the ticker says so.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Icon } from '@/design/Icon';
import { assetGradient } from '@/design/gradients';
import {
  AgentOrb,
  Button,
  EmptyState,
  Eyebrow,
  IconButton,
  LoadingRows,
  NoteStrip,
  Placeholder,
  Press,
  Row,
  Screen,
  Text,
  TransactionRef,
  colors,
  money,
  quantity,
  radius,
  size,
  space,
  typeScale,
} from '@/ui';
import { FillReceipt } from '@/ui/FillReceipt';
import { KillSwitchChip } from '@/ui/KillSwitchChip';
import { TradingTicker } from '@/ui/TradingTicker';
import { Rise } from '@/ui/Rise';
import { RollingNumber } from '@/ui/RollingNumber';
import { STAGGER } from '@/ui/motion';
import { selectionTick, successTap, warningTap } from '@/ui/haptics';
import { useRefreshControl } from '@/ui/useRefreshControl';
import { CLOCKIN_AGENTS } from '../agents';
import { STOCKS, explorerTx } from '../config';
import { checkIn, ensureDesk, feeMode, friendlyError, getDevnetSol, syncRemindersNow, useLive, type CheckInResult } from '../desk';
import { driftPct, nasdaqOpen } from '../engine';
import { useAutopilot, useScrollAutopilot } from '../autopilot';
import { useClockin } from '../session';
import { checkInReward, checkedInToday, currentStreak, streakAfterCheckIn, weekStrip } from '../streak';
import { rewardMultiplier } from '../tiers';
import { useDesk } from '../useDesk';
import { TokenMark, signedPct, usd, whole } from '../ui';

const AVATAR = 40;
const GRABBER_W = 36;
const GRABBER_H = 4;
const TAB_RULE = 2;
const ORB = 56 as const;
const TILE_W = '25%' as const;
/** The first sheet row's arrival index — after the header, the balance and the sheet itself, as on xorr's Home. */
const ROWS_FROM = 3;
const STEP_MARK = 14;
const STEP_RING = 1.5;
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type SheetTab = 'agents' | 'brief' | 'stocks' | 'skr';
const TABS: { key: SheetTab; label: string }[] = [
  { key: 'agents', label: 'Agents' },
  { key: 'brief', label: 'Brief' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'skr', label: 'SKR' },
];

export default function ClockinHome() {
  const router = useRouter();
  const { owner, live, st, plan, onPull } = useDesk();
  const refresh = useRefreshControl(onPull);
  const scroller = useScrollAutopilot();
  const streakState = useClockin((s) => s.streak);
  const activity = useClockin((s) => s.activity);
  const [tab, setTab] = useState<SheetTab>('agents');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "Since your last visit": read the last visit once as Home opens, then stamp this one.
  const [since] = useState(() => useClockin.getState().lastSeenAt);
  // The moment Home opened, so "N hours ago" is computed from state, not from the clock during render.
  const [openedAt] = useState(() => Date.now());
  useEffect(() => {
    useClockin.getState().set({ lastSeenAt: Date.now() });
  }, []);
  // Every time Home comes into view the reminders are re-aligned with today's clock-in (never a permission prompt).
  useFocusEffect(
    useCallback(() => {
      void syncRemindersNow();
    }, []),
  );

  const done = checkedInToday(streakState);
  const streak = currentStreak(streakState);
  const nextReward = checkInReward(done ? streak + 1 : streakAfterCheckIn(streakState), rewardMultiplier(st.tier, st.seeker));
  const busy = live.busy;
  const perm = st.permission;
  const total = live.view ? st.cashUsd + st.bookValue : null;
  const lastPermissionEvent = activity.find((a) => a.kind === 'grant' || a.kind === 'revoke')?.kind;
  const brief = result ? result.brief : plan.brief;
  const pnl = st.bookValue - st.bookCost;
  const standing = perm.live ? 'live' : lastPermissionEvent === 'revoke' ? 'revoked' : 'none';

  const title = owner?.kind === 'guest' ? 'Guest wallet' : (owner?.label ?? 'Wallet');
  const subtitle = owner ? `Devnet · ${owner.address.slice(0, 4)}…${owner.address.slice(-4)}` : 'Devnet';
  const initial = owner?.kind === 'mwa' ? 'S' : owner?.kind === 'privy' ? 'P' : 'G';

  // The ticker: what is happening right now, in one line — and, on tap, the one thing to do next.
  const looking = busy === 'Agent is looking';
  const ticker = done
    ? `Clocked in · ${streak}-day streak · +${nextReward} dSKR tomorrow`
    : perm.live
      ? `Your agent is watching · ${usd(perm.leftUsd, 0)} left to spend`
      : lastPermissionEvent === 'revoke'
        ? 'Trading is stopped · you revoked the permission'
        : lastPermissionEvent === 'grant'
          ? 'Your agent spent its allowance · grant more to keep it trading'
          : 'No agent is trading right now · give it a permission';
  const tickerOpensBrief = perm.live || done;

  const sinceTrades = activity.filter((a) => (a.kind === 'buy' || a.kind === 'sell') && a.ok && (since === null || a.at > since));
  const ago = since ? Math.max(1, Math.round((openedAt - since) / 3_600_000)) : null;
  const recentTrades = activity.filter((a) => (a.kind === 'buy' || a.kind === 'sell') && a.ok).slice(0, 3);

  function openTab(t: SheetTab) {
    selectionTick();
    setTab(t);
  }

  async function onClockIn() {
    if (!owner) return;
    setError(null);
    selectionTick();
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

  async function share() {
    selectionTick();
    const lines = [
      streak > 0 ? `${streak}-day streak on xorr` : 'Clocking in with my AI stock agent on xorr',
      st.bookCost > 0 ? `Agent book ${pnl >= 0 ? 'up' : 'down'} ${signedPct((pnl / st.bookCost) * 100)} on ${usd(st.bookCost, 0)} in` : null,
      `${st.tier.name} tier · ${whole(st.source.skr)} SKR`,
      'Tokenized US stocks on Solana, inside a permission I can revoke in one tap. (Devnet demo)',
    ].filter(Boolean);
    await Share.share({ message: lines.join('\n') }).catch(() => undefined);
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

  const days = weekStrip(streakState);
  const faucetDry = !!live.view && feeMode(live.view) === 'self' && live.view.sol < 0.003;

  return (
    <Screen tabBar gutter="none">
      <Rise index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingHorizontal: space.gutter }}>
        <Press
          onPress={() => router.push('/me')}
          accessibilityRole="button"
          accessibilityLabel={`Your profile, ${title}`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.s12 }}
        >
          <View style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
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
        <IconButton name="bell" accessibilityLabel="Reminders and settings" onPress={() => router.push('/me')} />
      </Rise>

      {/* Clipped to its own frame, so a scrolled balance never draws under the header. */}
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, overflow: 'hidden' }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={refresh.control}
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
          ) : live.error ? (
            <Text variant="heroBalance" style={{ marginTop: space.s6 }}>
              —
            </Text>
          ) : (
            <Placeholder width={190} height={46} style={{ marginTop: space.s8, borderRadius: radius.tile }} />
          )}
          {live.error ? (
            <Text variant="footnote" color={colors.warn} style={{ marginTop: space.s6 }} accessibilityLiveRegion="polite">
              {live.error}
            </Text>
          ) : null}
        </Rise>

        {live.error || live.setupFailed || faucetDry ? (
          <View style={{ marginTop: space.s12, paddingHorizontal: space.gutter }}>
            <Button
              label={busy ?? (live.setupFailed ? 'Try setting up again' : faucetDry ? 'Get devnet SOL' : 'Try again')}
              variant="secondary"
              loading={!!busy}
              onPress={() => {
                if (!owner) return;
                if (live.setupFailed) void ensureDesk(owner).catch((e) => useLive.setState({ error: friendlyError(e), setupFailed: true }));
                else if (faucetDry) void getDevnetSol(owner).catch((e) => setError(friendlyError(e)));
                else void onPull();
              }}
              testID="retry"
            />
          </View>
        ) : null}

        {/* The day's clock-in, in the shape of xorr's SetupCard: seven days across, one button. Gone once done. */}
        {live.view && !done ? (
          <Rise index={2} style={{ marginTop: space.s16, paddingHorizontal: space.gutter }}>
            <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface }} testID="clock-in">
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.s14, paddingTop: space.s12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessible accessibilityLabel={streak > 0 ? `${streak}-day streak` : 'No streak yet'}>
                  {streak > 0 ? <RollingNumber key={`s-${streak}`} value={String(streak)} variant="value" figure="market" roll /> : null}
                  <Text variant="value">{streak > 0 ? '-day streak' : 'Start a streak'}</Text>
                </View>
                <Text variant="secondarySm" color={colors.ink55}>
                  +{nextReward} dSKR today{st.seeker ? ' · Seeker 1.5×' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', marginTop: space.s4 }}>
                {days.map((d, i) => {
                  const dow = DOW[new Date(`${d.day}T12:00:00Z`).getUTCDay()];
                  return (
                    <View
                      key={d.day}
                      accessible
                      accessibilityLabel={`${d.today ? 'Today' : dow}, ${d.done ? 'clocked in' : d.today ? 'not yet' : 'missed'}`}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        gap: space.s6,
                        paddingVertical: space.s12,
                        borderLeftWidth: i > 0 ? 1 : 0,
                        borderLeftColor: colors.hairline,
                      }}
                    >
                      <View style={{ width: STEP_MARK, height: STEP_MARK, alignItems: 'center', justifyContent: 'center' }}>
                        {d.done ? (
                          <Icon name="check" size={STEP_MARK} color={colors.ink55} />
                        ) : d.today ? (
                          <View style={{ width: STEP_MARK, height: STEP_MARK, borderRadius: STEP_MARK / 2, borderWidth: STEP_RING, borderColor: colors.ink40 }} />
                        ) : (
                          <Text variant="secondarySm" color={colors.ink55}>
                            —
                          </Text>
                        )}
                      </View>
                      <Text variant="secondarySm" color={d.today ? colors.ink : colors.ink55}>
                        {dow}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={{ paddingHorizontal: space.s14, paddingBottom: space.s14 }}>
                {error ? (
                  <Text variant="footnote" color={colors.warn} style={{ marginBottom: space.s10 }} accessibilityLiveRegion="polite">
                    {error}
                  </Text>
                ) : null}
                <Button label={busy ? busy : `Clock in · +${nextReward} dSKR`} loading={!!busy} onPress={onClockIn} testID="clock-in-button" />
              </View>
            </View>
          </Rise>
        ) : null}

        <Rise index={2} style={{ marginTop: space.s12, paddingHorizontal: space.gutter }}>
          <Press
            onPress={() => (tickerOpensBrief ? openTab('brief') : router.push('/desk'))}
            accessibilityRole="button"
            accessibilityHint={tickerOpensBrief ? 'Opens the brief' : 'Opens your agent’s permission'}
          >
            <TradingTicker
              runs={looking ? [{ id: 'look', status: 'running', symbol: 'xStocks', label: 'Your agent', at: new Date().toISOString() }] : []}
              lastLook={{ headline: ticker }}
              failed={!!live.error && !live.view}
              testID="ticker"
            />
          </Press>
        </Rise>

        {/* The sheet. */}
        <Rise
          index={2}
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
              accessibilityLabel="Your agent’s permission. Opens Safety."
              style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', paddingBottom: space.s10, paddingRight: space.gutter }}
            >
              <KillSwitchChip standing={live.view ? standing : undefined} failed={!!live.error && !live.view} />
            </Press>
          </View>

          <View style={{ flexGrow: 1, paddingHorizontal: space.gutter, marginTop: space.s4 }}>
            {!live.view && tab !== 'agents' ? (
              <LoadingRows count={4} height={size.rowLg} />
            ) : tab === 'agents' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.s18, marginTop: space.s18 }}>
                {CLOCKIN_AGENTS.map((a, i) => {
                  const on = st.strategies.includes(a.id);
                  return (
                    <Rise key={a.id} index={ROWS_FROM + i} style={{ width: TILE_W }}>
                      <Press
                        onPress={() => router.push(`/agent/${a.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`${a.name}, ${on ? 'hired' : 'not hired'}. ${a.role}`}
                        style={{ alignItems: 'center', gap: space.s8, paddingHorizontal: space.s4 }}
                      >
                        <AgentOrb gradient={a.gradient} size={ORB} face />
                        <Text variant="orbName" align="center" numberOfLines={2} style={{ minHeight: typeScale.orbName.lineHeight * 2 }}>
                          {a.name}
                        </Text>
                        <Text variant="orbStatus" color={on ? colors.ink55 : colors.ink30}>
                          {on ? 'Hired' : 'Not hired'}
                        </Text>
                      </Press>
                    </Rise>
                  );
                })}
                <Rise index={ROWS_FROM + CLOCKIN_AGENTS.length} style={{ width: TILE_W }}>
                  <Press
                    onPress={() => router.push('/agent/nightShift')}
                    accessibilityRole="button"
                    accessibilityLabel="Hire a shift with SKR"
                    style={{ alignItems: 'center', gap: space.s8, paddingHorizontal: space.s4 }}
                  >
                    <View style={{ width: ORB, height: ORB, borderRadius: ORB / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.ink28 }}>
                      <Icon name="plus" size={26} color={colors.ink55} strokeWidth={2} />
                    </View>
                    <Text variant="orbName" align="center" numberOfLines={2} style={{ minHeight: typeScale.orbName.lineHeight * 2 }}>
                      Hire a shift
                    </Text>
                    <Text variant="orbStatus" color={colors.ink30}>
                      Pay in SKR
                    </Text>
                  </Press>
                </Rise>
              </View>
            ) : tab === 'brief' ? (
              <View style={{ marginTop: space.s16, gap: space.s10 }} testID="agent-brief">
                <Rise index={ROWS_FROM}>
                  <Text variant="cardTitle">{brief.headline}</Text>
                </Rise>
                {since !== null ? (
                  <Rise index={ROWS_FROM + 1}>
                    <NoteStrip gradient={CLOCKIN_AGENTS[0]!.gradient}>
                      {`Since your last visit${ago ? ` (${ago < 24 ? `${ago}h` : `${Math.round(ago / 24)}d`} ago)` : ''}: ${
                        sinceTrades.length
                          ? `${sinceTrades.length} trade${sinceTrades.length > 1 ? 's' : ''} — ${sinceTrades
                              .slice(0, 2)
                              .map((t) => t.title.replace(/^Agent /, ''))
                              .join(', ')}.`
                          : perm.live
                            ? 'no trades — nothing met the rules, so it held.'
                            : 'no trades — it has no permission to spend.'
                      }`}
                    </NoteStrip>
                  </Rise>
                ) : null}
                {brief.lines.map((l, i) => (
                  <Rise key={i} index={ROWS_FROM + 2 + i}>
                    <NoteStrip gradient={CLOCKIN_AGENTS[0]!.gradient}>{l}</NoteStrip>
                  </Rise>
                ))}
                {result?.trades.some((t) => t.decision.action !== 'hold' && t.sig && !t.error) ? (
                  <View style={{ marginTop: space.s6, gap: space.s10 }}>
                    <Eyebrow small>What it did just now</Eyebrow>
                    {result.trades
                      .filter((t) => t.decision.action !== 'hold' && t.sig && !t.error)
                      .map((t, i) => (
                        <View key={i}>
                          <Row
                            height={size.rowLg}
                            divider={false}
                            title={t.decision.action === 'buy' ? `Bought ${usd(t.decision.usd ?? 0)} of ${t.decision.symbol}` : `Sold ${t.decision.symbol}`}
                            secondary={t.decision.reason}
                          />
                          <FillReceipt signature={t.sig!} venue="devnet-venue" />
                        </View>
                      ))}
                  </View>
                ) : recentTrades.length ? (
                  <View style={{ marginTop: space.s6 }}>
                    <Eyebrow small>Recent trades</Eyebrow>
                    {recentTrades.map((t, i) => (
                      <Row
                        key={t.id}
                        height={size.rowLg}
                        divider={i < recentTrades.length - 1}
                        title={t.title.replace(/^Agent /, '')}
                        secondary={new Date(t.at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        right={t.sig ? <TransactionRef explorer={explorerTx(t.sig)} /> : undefined}
                      />
                    ))}
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: space.s10, marginTop: space.s6 }}>
                  <Button label="Ask your agent" variant="ghost" onPress={() => router.push('/ask')} style={{ flex: 1 }} />
                  <Button label="Share" variant="ghost" onPress={() => void share()} style={{ flex: 1 }} testID="share" />
                </View>
              </View>
            ) : tab === 'stocks' ? (
              <View style={{ marginTop: space.s6 }}>
                {Object.keys(st.holdings).length === 0 ? (
                  <EmptyState
                    text="No positions yet. Your agent buys once it has a permission and something meets its rules."
                    actionLabel={perm.live ? undefined : 'Give it a permission'}
                    onAction={perm.live ? undefined : () => router.push('/desk')}
                  />
                ) : (
                  Object.values(st.holdings).map((h, i, all) => {
                    const def = STOCKS.find((s) => s.symbol === h.symbol)!;
                    const q = live.prices?.quotes[h.symbol];
                    const value = h.qty * (q?.usd ?? 0);
                    const p = h.cost > 0 ? ((value - h.cost) / h.cost) * 100 : 0;
                    return (
                      <Rise key={`h-${h.symbol}`} index={ROWS_FROM + i}>
                        <Row
                          height={size.rowLg}
                          divider={i < all.length - 1}
                          left={<TokenMark symbol={h.symbol} c1={def.c1} c2={def.c2} />}
                          title={h.symbol}
                          secondary={`${quantity(h.qty, 4)} · avg ${usd(h.qty > 0 ? h.cost / h.qty : 0)}`}
                          value={usd(value)}
                          figure="own"
                          delta={signedPct(p)}
                          deltaTone={p > 0 ? 'up' : p < 0 ? 'down' : 'neutral'}
                        />
                      </Rise>
                    );
                  })
                )}
                <Eyebrow small style={{ marginTop: space.s22, marginBottom: space.s4 }}>
                  {`Cash and the market · Nasdaq ${nasdaqOpen(new Date()) ? 'open' : 'shut'}`}
                </Eyebrow>
                <Row
                  height={size.rowLg}
                  left={<TokenMark symbol="USDC" c1={assetGradient('USDC').c1} c2={assetGradient('USDC').c2} />}
                  title="dUSDC"
                  secondary="Devnet stand-in for USDC"
                  value={usd(st.cashUsd)}
                  figure="own"
                />
                {STOCKS.map((s, i) => {
                  const q = live.prices?.quotes[s.symbol];
                  const d = q ? driftPct(q) : null;
                  return (
                    <Rise key={s.symbol} index={ROWS_FROM + i}>
                      <Row
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
                    </Rise>
                  );
                })}
              </View>
            ) : (
              <View style={{ marginTop: space.s6 }}>
                <Rise index={ROWS_FROM}>
                  <Row
                    height={size.rowLg}
                    left={<TokenMark symbol="SKR" c1={colors.agent.earnings.c1} c2={colors.agent.earnings.c2} />}
                    title={`${st.tier.name} tier`}
                    secondary={st.tier.perk}
                    value={`${whole(st.source.skr)} SKR`}
                    onPress={() => router.push('/skr')}
                  />
                </Rise>
                <Rise index={ROWS_FROM + 1}>
                  <Row height={size.rowLg} title="dSKR held" secondary="Devnet stand-in for SKR · earned by clocking in" value={whole(st.skrHeld)} figure="own" />
                </Rise>
                <Rise index={ROWS_FROM + 2}>
                  <Row
                    height={size.rowLg}
                    title="SKR on mainnet"
                    secondary="Read only, never moved · counts toward your tier"
                    value={live.mainnetSkr == null ? '—' : whole(live.mainnetSkr)}
                  />
                </Rise>
                <Rise index={ROWS_FROM + 3}>
                  <Row
                    height={size.rowLg}
                    divider={false}
                    title="Seeker Genesis Token"
                    secondary={live.sgt ? 'Verified · 1.5× every clock-in' : 'Not in this wallet · Seekers earn 1.5×'}
                    value={live.sgt ? 'Seeker' : '—'}
                  />
                </Rise>
                <Button label="Earn, spend and hold SKR" variant="ghost" onPress={() => router.push('/skr')} style={{ marginTop: space.s16 }} />
              </View>
            )}
          </View>
        </Rise>
      </ScrollView>
    </Screen>
  );
}
