/**
 * Your agent — the permission, in xorr's Safety layout (CLOCK IN build).
 *
 * The state chip and one sentence from the chain; the cap as a ring; the two parties to the permission; the agent's
 * look with a reason per stock; its strategies, hired by tier or by an SKR shift; the trail. At the bottom, the one
 * button that matters: grant, or — held, not tapped — stop. *Test the cap* asks the agent to overspend and shows the
 * token program refusing it on devnet.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useGoBack } from '@/nav/useGoBack';
import { AgentOrb, BackButton, Button, Fill, HoldButton, Press, Ring, Row, Screen, SheetCard, Text, colors, radius, size, space } from '@/ui';
import { heavyTap, killTap, successTap, warningTap } from '@/ui/haptics';
import { CLOCKIN_AGENTS } from '@/clockin/agents';
import { useAutopilot, useScrollAutopilot } from '@/clockin/autopilot';
import { agentLook, buyShift, friendlyError, grant, revoke, testCap, type TradeResult } from '@/clockin/desk';
import { useClockin } from '@/clockin/session';
import { SHIFT_PRICE, STRATEGY_INFO, type StrategyId } from '@/clockin/tiers';
import { useDesk } from '@/clockin/useDesk';
import { AddressLink, Banner, Eyebrow, SKR_GOLD, TxLink, usd } from '@/clockin/ui';

const CAPS = [50, 100, 250];
const SIZES = [10, 25, 50];
const DOT = 8;

export default function Desk() {
  const goBack = useGoBack('/');
  const { owner, live, st, plan } = useDesk();
  const scroller = useScrollAutopilot();
  const activity = useClockin((s) => s.activity);
  const passes = useClockin((s) => s.passes);
  const perTrade = useClockin((s) => s.perTradeUsd);
  const set = useClockin((s) => s.set);
  const [cap, setCap] = useState(100);
  const [note, setNote] = useState<{ text: string; tone: 'up' | 'down' | 'warn'; sig?: string } | null>(null);
  const [look, setLook] = useState<TradeResult[] | null>(null);
  const busy = live.busy;
  const perm = st.permission;
  const lastPermissionEvent = activity.find((a) => a.kind === 'grant' || a.kind === 'revoke')?.kind;
  const lastGrant = activity.find((a) => a.kind === 'grant');
  const grantedCap = lastGrant ? Number(/([\d.]+) dUSDC/.exec(lastGrant.title)?.[1] ?? 0) : 0;
  const used = perm.live && grantedCap > 0 ? Math.max(0, Math.min(1, (grantedCap - perm.leftUsd) / grantedCap)) : undefined;

  async function run<T>(fn: () => Promise<T>, ok: (r: T) => { text: string; sig?: string; tone?: 'up' | 'down' | 'warn' }) {
    if (!owner) return;
    setNote(null);
    try {
      const r = await fn();
      successTap();
      const o = ok(r);
      setNote({ tone: o.tone ?? 'up', text: o.text, sig: o.sig });
    } catch (e) {
      warningTap();
      setNote({ tone: 'down', text: friendlyError(e) });
    }
  }

  const doGrant = () => {
    heavyTap();
    return run(() => grant(owner!, cap), (sig) => ({ text: `Granted. The agent may spend up to ${cap} dUSDC.`, sig }));
  };
  const doCap = () =>
    run(
      () => testCap(owner!),
      (r) => ({
        tone: 'up',
        text: `Cap held. The agent tried to move ${r.tried} dUSDC with ${r.left.toFixed(0)} approved, and the token program refused (${r.message.replace('Program log: ', '')}). Nothing moved.`,
        sig: r.sig,
      }),
    );
  const doRevoke = () => {
    killTap();
    return run(() => revoke(owner!), (sig) => ({ tone: 'warn', text: 'Revoked. The agent can move nothing now, stop-losses included.', sig }));
  };
  const doLook = async () => {
    if (!owner) return;
    setNote(null);
    try {
      setLook(await agentLook(owner));
      successTap();
    } catch (e) {
      warningTap();
      setNote({ tone: 'down', text: friendlyError(e) });
    }
  };
  const doShift = (id: StrategyId) =>
    run(() => buyShift(owner!, id), (sig) => ({ text: `${STRATEGY_INFO[id].name} is on for 24 hours, paid in SKR.`, sig }));

  useAutopilot(
    {
      grant: () => owner && doGrant(),
      cap: () => owner && doCap(),
      revoke: () => owner && doRevoke(),
      look: () => doLook(),
      'shift-dip': () => owner && doShift('dip'),
      'shift-night': () => owner && doShift('nightShift'),
    },
    !!owner && !!live.view,
  );

  const trail = activity.filter((a) => ['grant', 'revoke', 'buy', 'sell', 'refused', 'look', 'shift'].includes(a.kind)).slice(0, 10);
  const state = perm.live ? 'Live' : lastPermissionEvent === 'revoke' ? 'Stopped' : lastPermissionEvent === 'grant' ? 'Spent' : 'Not granted';
  const title = perm.live
    ? 'Your agent is trading'
    : lastPermissionEvent === 'revoke'
      ? 'Trading is stopped'
      : lastPermissionEvent === 'grant'
        ? 'The allowance is spent'
        : 'Give your agent a permission';
  const sentence = perm.live
    ? `It may spend ${usd(perm.leftUsd)} more of your dUSDC — the token program stops it there — and sell what it bought.`
    : 'It reads the market and says what it would do. It can move nothing until you sign a permission.';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s8 }}>
        <BackButton onPress={() => goBack()} />
        <Text variant="screenTitle">Your agent</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.s8,
          alignSelf: 'flex-start',
          marginTop: space.s20,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.card,
          paddingHorizontal: space.s12,
          paddingVertical: space.s6,
        }}
      >
        <View style={{ width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: perm.live ? colors.up : colors.ink30 }} />
        <Text variant="tagSm" color={perm.live ? colors.up : colors.ink55}>
          {state}
        </Text>
      </View>
      <Text variant="onboardingTitle" style={{ marginTop: space.s16 }}>
        {title}
      </Text>
      <Text variant="body" color={colors.ink55} style={{ marginTop: space.s8 }}>
        {sentence}
      </Text>

      <Fill style={{ marginTop: space.s20 }}>
        <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.s16, gap: space.s12 }}>
          {note ? (
            <View style={{ gap: space.s4 }}>
              <Banner text={note.text} tone={note.tone} />
              <TxLink sig={note.sig} />
            </View>
          ) : null}

          {perm.live ? (
            <SheetCard borderRadius={radius.panel} padding={space.s16}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <Ring fraction={used} value={used === undefined ? '—' : `${Math.round(used * 100)}%`} label="Cap used" />
                <Ring fraction={grantedCap > 0 ? perm.leftUsd / grantedCap : undefined} value={usd(perm.leftUsd, 0)} label="Left to spend" />
              </View>
            </SheetCard>
          ) : (
            <SheetCard borderRadius={radius.panel} padding={space.s16} testID="permission">
              <Eyebrow>Approve the agent’s key to spend up to</Eyebrow>
              <View style={{ flexDirection: 'row', gap: space.s8 }}>
                {CAPS.map((c) => (
                  <Press
                    key={c}
                    onPress={() => setCap(c)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: cap === c }}
                    style={{ flex: 1, height: 46, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center', backgroundColor: cap === c ? colors.ink : colors.control }}
                  >
                    <Text variant="value" color={cap === c ? colors.bg : colors.ink}>
                      {c} dUSDC
                    </Text>
                  </Press>
                ))}
              </View>
              <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s10 }}>
                One transaction you sign: ApproveChecked on your dUSDC for the cap, and on each stock so its exits can sell while
                you are away. Revoke any time.
              </Text>
            </SheetCard>
          )}

          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Row title="Your wallet" value={<AddressLink address={owner?.address ?? ''} />} height={size.rowSm} />
            <Row
              title="Agent key"
              secondary="On this phone · can’t withdraw"
              value={live.agent ? <AddressLink address={live.agent} /> : '—'}
              height={size.row}
            />
          </SheetCard>

          {/* The look. */}
          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Eyebrow>Ask it to look now</Eyebrow>
            <View style={{ flexDirection: 'row', gap: space.s8 }}>
              {SIZES.map((n) => (
                <Press
                  key={n}
                  onPress={() => set({ perTradeUsd: n })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: perTrade === n }}
                  style={{ flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: perTrade === n ? colors.ink : colors.control }}
                >
                  <Text variant="control" color={perTrade === n ? colors.bg : colors.ink}>
                    ${n} a trade
                  </Text>
                </Press>
              ))}
            </View>
            <Button
              label={busy === 'Agent is looking' ? 'Looking…' : 'Look now'}
              variant="secondary"
              loading={busy === 'Agent is looking'}
              disabled={!!busy}
              onPress={doLook}
              style={{ marginTop: space.s12 }}
              testID="look-now"
            />
            {(look ?? plan.decisions.map((decision) => ({ decision }) as TradeResult)).map((r, i) => (
              <View key={`${r.decision.symbol}-${i}`} style={{ marginTop: space.s12, flexDirection: 'row', gap: space.s10 }}>
                <View
                  style={{
                    width: 44,
                    height: 22,
                    borderRadius: 11,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: r.error ? colors.downBg : r.decision.action === 'hold' ? colors.neutralBg : colors.upBg,
                  }}
                >
                  <Text variant="chipSm" color={r.error ? colors.down : r.decision.action === 'hold' ? colors.ink50 : colors.up}>
                    {r.decision.action.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="rowPrimary">
                    {r.decision.symbol}
                    {r.decision.usd ? ` · ${usd(r.decision.usd)}` : ''}
                    {!look && r.decision.action !== 'hold' ? ' (planned)' : ''}
                  </Text>
                  <Text variant="footnote" color={r.error ? colors.down : colors.ink55}>
                    {r.error ?? r.decision.reason}
                  </Text>
                  <TxLink sig={r.sig} />
                </View>
              </View>
            ))}
          </SheetCard>

          {/* The agents: each strategy, by tier or by an SKR shift. */}
          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Eyebrow color={SKR_GOLD}>{`Agents · ${st.tier.name} tier`}</Eyebrow>
            {CLOCKIN_AGENTS.map((a) => {
              const on = st.strategies.includes(a.id);
              const included = st.tier.strategies.includes(a.id);
              const pass = passes[a.id];
              const passLive = !!pass && pass.until > (live.prices?.at ?? 0);
              return (
                <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10 }}>
                  <AgentOrb gradient={a.gradient} size={52} face />
                  <View style={{ flex: 1 }}>
                    <Text variant="rowPrimary">{a.name}</Text>
                    <Text variant="footnote" color={colors.ink45}>
                      {a.role}
                    </Text>
                    <Text variant="footnoteSm" color={on ? colors.ink65 : colors.ink38}>
                      {included
                        ? `Included in ${st.tier.name}`
                        : passLive
                          ? `Hired until ${new Date(pass!.until).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}`
                          : 'Not hired'}
                    </Text>
                  </View>
                  {!included && !passLive ? (
                    <Button
                      label={`${SHIFT_PRICE[a.id]} SKR`}
                      variant="secondary"
                      height={38}
                      disabled={!!busy}
                      onPress={() => doShift(a.id)}
                      testID={`shift-${a.id}`}
                    />
                  ) : null}
                </View>
              );
            })}
            <Text variant="footnoteSm" color={colors.ink32}>
              A shift runs 24 hours and is paid in dSKR, the devnet stand-in for SKR.
            </Text>
          </SheetCard>

          {perm.live ? (
            <Button label="Test the cap" variant="ghost" loading={busy === 'Testing the cap'} disabled={!!busy} onPress={doCap} testID="test-cap" />
          ) : null}

          {/* The trail. */}
          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Eyebrow>Trail · every action on devnet</Eyebrow>
            {trail.length ? (
              trail.map((a, i) => (
                <View key={a.id} style={{ paddingVertical: space.s8, borderBottomWidth: i < trail.length - 1 ? 1 : 0, borderBottomColor: colors.hairline }}>
                  <Text variant="rowPrimary" color={a.ok ? colors.ink : colors.down}>
                    {a.title}
                  </Text>
                  {a.detail ? (
                    <Text variant="footnote" color={colors.ink45} numberOfLines={2}>
                      {a.detail}
                    </Text>
                  ) : null}
                  <TxLink sig={a.sig} label="Explorer" />
                </View>
              ))
            ) : (
              <Text variant="bodySm" color={colors.ink45}>
                Nothing yet.
              </Text>
            )}
          </SheetCard>
        </ScrollView>
      </Fill>

      {perm.live ? (
        <>
          <HoldButton label="Stop all trading" accessibilityHint="Hold to stop" height={size.buttonLg} loading={busy === 'Revoking'} onCommit={doRevoke} testID="revoke" />
          <Text variant="footnote" color={colors.ink55} align="center" style={{ marginTop: space.s12 }}>
            Hold to sign an SPL Revoke on every account. Your funds stay in your wallet.
          </Text>
        </>
      ) : (
        <Button
          label={busy === 'Granting the permission' ? 'Signing…' : `Sign permission · ${cap} dUSDC`}
          height={size.buttonLg}
          loading={busy === 'Granting the permission'}
          disabled={!!busy || st.cashUsd <= 0}
          onPress={doGrant}
          testID="grant"
        />
      )}
    </Screen>
  );
}
