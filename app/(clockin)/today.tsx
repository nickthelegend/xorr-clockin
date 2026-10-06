/**
 * Today — the screen a person opens every morning.
 *
 * The agent first: its face, what it is doing, and the brief it wrote from this morning's numbers. Then the clock-in —
 * one signature, a streak and the day's SKR — after which the agent takes its look and reports what it traded. Then the
 * book it keeps, priced live, and the market it watches.
 */
import React, { useState } from 'react';
import { RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AgentOrb, Button, Screen, Text, colors, radius, space } from '@/ui';
import { heavyTap, successTap, warningTap } from '@/ui/haptics';
import { STOCKS } from '@/clockin/config';
import { checkIn, feeMode, getDevnetSol, type CheckInResult } from '@/clockin/desk';
import { driftPct, nasdaqOpen } from '@/clockin/engine';
import { askAgent, getAiKey, narrateBrief } from '@/clockin/ai';
import { useClockin } from '@/clockin/session';
import { checkInReward, checkedInToday, currentStreak, streakAfterCheckIn } from '@/clockin/streak';
import { rewardMultiplier, STRATEGY_INFO } from '@/clockin/tiers';
import { useDesk } from '@/clockin/useDesk';
import { useAutopilot, useScrollAutopilot } from '@/clockin/autopilot';

import { Banner, Card, DevnetPill, Eyebrow, SKR_GOLD, StockMark, TxLink, WeekStrip, signedPct, signedUsd, usd } from '@/clockin/ui';

export default function Today() {
  const router = useRouter();
  const { owner, live, st, plan, pulling, onPull } = useDesk();
  const scroller = useScrollAutopilot();
  const streakState = useClockin((s) => s.streak);
  const activity = useClockin((s) => s.activity);
  const aiModel = useClockin((s) => s.aiModel);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiLines, setAiLines] = useState<string[] | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const done = checkedInToday(streakState);
  const streak = currentStreak(streakState);
  const nextReward = checkInReward(done ? streak + 1 : streakAfterCheckIn(streakState), rewardMultiplier(st.tier, st.seeker));
  const brief = plan.brief;
  const pnl = st.bookValue - st.bookCost;
  const busy = live.busy;
  const working = st.permission.live;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  // Whether the latest permission event was a grant: an empty allowance then means "spent", not "never given".
  const granted = activity.find((a) => a.kind === 'grant' || a.kind === 'revoke')?.kind === 'grant';
  const todaysSig = result?.sig ?? activity.find((a) => a.kind === 'checkin')?.sig;

  const aiContext = () => ({
    brief,
    decisions: plan.decisions,
    quotes: live.prices?.quotes ?? {},
    holdings: st.holdings,
    cashUsd: st.cashUsd,
    tier: st.tier.name,
    streak,
  });

  async function onClockIn() {
    if (!owner) return;
    setError(null);
    heavyTap();
    try {
      const r = await checkIn(owner);
      successTap();
      setResult(r);
      if (await getAiKey()) narrateBrief(aiModel, { ...aiContext(), brief: r.brief, streak: r.streak }).then(setAiLines).catch(() => undefined);
    } catch (e) {
      warningTap();
      setError((e as Error).message);
    }
  }

  async function onAsk() {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      setAnswer(await askAgent(aiModel, question, aiContext()));
    } catch (e) {
      setAnswer((e as Error).message);
    } finally {
      setAsking(false);
    }
  }

  useAutopilot({ checkin: onClockIn }, !!owner && !!live.view);

  const shown = result ? result.brief : brief;
  const lines = aiLines ?? shown.lines;

  return (
    <Screen gutter="none">
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.s44, gap: space.s16 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={colors.ink55} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.s8 }}>
          <View style={{ flexShrink: 1 }}>
            <Text variant="screenTitle">{greeting}</Text>
            <Text variant="secondary" color={colors.ink45} numberOfLines={1}>
              {owner?.label} · {owner ? `${owner.address.slice(0, 4)}…${owner.address.slice(-4)}` : ''}
            </Text>
          </View>
          <DevnetPill />
        </View>

        {live.error ? <Banner text={live.error} /> : null}
        {live.view && feeMode(live.view) === 'self' && live.view.sol < 0.003 ? (
          <Card>
            <Text variant="bodySm" color={colors.ink70}>
              xorr's devnet faucet is out of SOL right now, so transactions need a little devnet SOL of your own (free, test
              only).
            </Text>
            <Button
              label="Get devnet SOL"
              variant="secondary"
              loading={busy === 'Requesting devnet SOL'}
              onPress={() => {
                if (owner) void getDevnetSol(owner).catch((e) => setError((e as Error).message));
              }}
              style={{ marginTop: space.s10 }}
            />
          </Card>
        ) : null}

        {/* The agent, front and centre. */}
        <Card testID="agent-brief" style={{ paddingTop: space.s22 }}>
          <View style={{ flexDirection: 'row', gap: space.s16, alignItems: 'center' }}>
            <AgentOrb gradient={colors.agent.momentum} size={74} bloom face identity="xorr-clockin" status={working ? 'active' : 'paused'} />
            <View style={{ flex: 1 }}>
              <Text variant="eyebrowSm" color={working ? colors.up : colors.ink45}>
                {working
                  ? `Working · ${usd(st.permission.leftUsd, 0)} left to spend`
                  : granted
                    ? 'Watching · allowance used up or revoked'
                    : 'Watching · no permission yet'}
              </Text>
              <Text variant="cardTitleLg" style={{ marginTop: space.s6 }}>
                {shown.headline}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: space.s14, gap: space.s8 }}>
            {lines.map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.s8 }}>
                <Text variant="bodySm" color={colors.ink38}>
                  ›
                </Text>
                <Text variant="bodySm" color={colors.ink70} style={{ flex: 1 }}>
                  {l}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s12 }}>
            {aiLines ? `Narrated by ${aiModel} from the agent's numbers` : 'Written by the on-device agent from live Jupiter prices'} · running{' '}
            {st.strategies.map((s) => STRATEGY_INFO[s].name).join(', ')}
          </Text>
          {result?.trades.length ? (
            <View style={{ marginTop: space.s14, gap: space.s6 }}>
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
              {result.trades.every((t) => t.decision.action === 'hold') ? (
                <Text variant="bodySm" color={colors.ink55}>
                  Nothing met its rules — it held.
                </Text>
              ) : null}
            </View>
          ) : null}
          {!working ? (
            <Button label="Give the agent a permission" variant="secondary" onPress={() => router.navigate('/desk')} style={{ marginTop: space.s16 }} testID="go-desk" />
          ) : null}
        </Card>

        {/* The daily clock-in. */}
        <Card testID="clock-in" style={{ borderColor: done ? colors.cardBorder : 'rgba(245,206,95,0.35)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.s14 }}>
            <View>
              <Text variant="eyebrow" color={SKR_GOLD}>
                Daily clock-in
              </Text>
              <Text variant="titleLg" style={{ marginTop: space.s4 }}>
                {streak > 0 ? `${streak}-day streak` : 'Start a streak'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="amountMd" color={SKR_GOLD}>
                +{nextReward}
              </Text>
              <Text variant="footnoteSm" color={colors.ink45}>
                dSKR {done ? 'tomorrow' : 'today'}
                {st.seeker ? ' · Seeker 1.5×' : ''}
              </Text>
            </View>
          </View>
          <WeekStrip streak={streakState} />
          {error ? (
            <View style={{ marginTop: space.s12 }}>
              <Banner text={error} tone="down" />
            </View>
          ) : null}
          {done ? (
            <View style={{ marginTop: space.s16, gap: space.s4 }}>
              <Text variant="bodySm" color={colors.ink70}>
                Clocked in today. Your streak is safe until tomorrow night (UTC) — the morning brief will remind you.
              </Text>
              <TxLink sig={todaysSig} label="Today's clock-in on chain" />
            </View>
          ) : (
            <Button
              label={busy ? busy : `Clock in · +${nextReward} dSKR`}
              loading={!!busy}
              onPress={onClockIn}
              backgroundColor={SKR_GOLD}
              color={colors.goldInk}
              style={{ marginTop: space.s16 }}
              testID="clock-in-button"
            />
          )}
          <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s10 }}>
            One signature: a memo from your wallet on Solana devnet, plus the reward in dSKR, the devnet stand-in for SKR.
            {feeMode(live.view) === 'faucet' ? ' xorr pays the network fee.' : ' You pay the devnet fee (test SOL).'}
          </Text>
        </Card>

        {/* The book. */}
        <Card>
          <Eyebrow>Agent book · devnet stand-ins at live prices</Eyebrow>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text variant="amountLg">{usd(st.bookValue + st.cashUsd)}</Text>
              <Text variant="footnote" color={colors.ink45}>
                {usd(st.cashUsd)} dUSDC · {usd(st.bookValue)} in stocks
              </Text>
            </View>
            {st.bookCost > 0 ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="value" color={pnl >= 0 ? colors.up : colors.down}>
                  {signedUsd(pnl)}
                </Text>
                <Text variant="footnote" color={pnl >= 0 ? colors.up : colors.down}>
                  {signedPct((pnl / st.bookCost) * 100)}
                </Text>
              </View>
            ) : null}
          </View>
          {Object.values(st.holdings).map((h) => {
            const def = STOCKS.find((s) => s.symbol === h.symbol)!;
            const q = live.prices?.quotes[h.symbol];
            const value = h.qty * (q?.usd ?? 0);
            const p = h.cost > 0 ? ((value - h.cost) / h.cost) * 100 : 0;
            return (
              <View key={h.symbol} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s12, marginTop: space.s14 }}>
                <StockMark symbol={h.symbol} c1={def.c1} c2={def.c2} />
                <View style={{ flex: 1 }}>
                  <Text variant="rowPrimary">{h.symbol}</Text>
                  <Text variant="footnote" color={colors.ink45}>
                    {h.qty.toFixed(4)} · cost {usd(h.cost)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="value">{usd(value)}</Text>
                  <Text variant="footnote" color={p >= 0 ? colors.up : colors.down}>
                    {signedPct(p)}
                  </Text>
                </View>
              </View>
            );
          })}
          {!Object.keys(st.holdings).length ? (
            <Text variant="bodySm" color={colors.ink45} style={{ marginTop: space.s12 }}>
              No positions yet. Grant a permission and clock in — the agent takes its first look right after.
            </Text>
          ) : null}
        </Card>

        {/* The market it watches. */}
        <Card>
          <Eyebrow>Watching · {nasdaqOpen(new Date()) ? 'Nasdaq open' : 'Nasdaq shut, xStocks still trade'}</Eyebrow>
          {STOCKS.map((s) => {
            const q = live.prices?.quotes[s.symbol];
            const d = q ? driftPct(q) : null;
            return (
              <View key={s.symbol} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s8 }}>
                <StockMark symbol={s.symbol} c1={s.c1} c2={s.c2} size={30} />
                <View style={{ flex: 1 }}>
                  <Text variant="rowPrimary">{s.symbol}</Text>
                  <Text variant="footnote" color={colors.ink45}>
                    {d === null ? s.name : `pool ${signedPct(d)} vs issuer`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="value">{q ? usd(q.usd) : '—'}</Text>
                  {q?.change24h != null ? (
                    <Text variant="footnote" color={q.change24h >= 0 ? colors.up : colors.down}>
                      {signedPct(q.change24h)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
          <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s6 }}>
            Prices are Jupiter's live quotes for the real mainnet xStocks (read-only). What moves here is devnet stand-ins.
          </Text>
        </Card>

        {/* Ask the agent. */}
        <Card>
          <Eyebrow>Ask your agent</Eyebrow>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Why did you buy NVDAx?"
            placeholderTextColor={colors.ink38}
            style={{ backgroundColor: colors.inputBg, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.inputBorder, color: colors.ink, padding: 12, fontSize: 15 }}
            onSubmitEditing={onAsk}
            returnKeyType="send"
          />
          <Button label="Ask" variant="secondary" loading={asking} onPress={onAsk} style={{ marginTop: space.s10 }} />
          {answer ? (
            <Text variant="bodySm" color={colors.ink70} style={{ marginTop: space.s10 }}>
              {answer}
            </Text>
          ) : null}
          <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s8 }}>
            Uses your own OpenRouter key (Me tab), kept in this phone's keystore. The decisions stay the agent's rules; a
            model only explains them.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
