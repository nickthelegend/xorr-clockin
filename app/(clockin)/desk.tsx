/**
 * Agent — the permission and the agent that works inside it.
 *
 * The permission is the product: one SPL `ApproveChecked` the owner signs, a cap the token program enforces, and a
 * `Revoke` that stops everything. This screen lets a judge feel all three in a minute — grant, watch the agent trade,
 * make it try to overspend and see devnet refuse, then revoke.
 */
import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { AgentOrb, Button, Screen, Text, colors, radius, space } from '@/ui';
import { heavyTap, killTap, successTap, warningTap } from '@/ui/haptics';
import { Press } from '@/ui';
import { agentLook, buyShift, grant, revoke, testCap, type TradeResult } from '@/clockin/desk';
import { useClockin } from '@/clockin/session';
import { SHIFT_PRICE, STRATEGY_INFO, type StrategyId } from '@/clockin/tiers';
import { useDesk } from '@/clockin/useDesk';
import { useAutopilot, useScrollAutopilot } from '@/clockin/autopilot';

import { AddressLink, Banner, Card, DevnetPill, Eyebrow, SKR_GOLD, TxLink, usd } from '@/clockin/ui';

const CAPS = [50, 100, 250];
const SIZES = [10, 25, 50];

export default function Desk() {
  const { owner, live, st, plan, pulling, onPull } = useDesk();
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
      setNote({ tone: 'down', text: (e as Error).message });
    }
  }

  useAutopilot(
    {
      grant: () => owner && run(() => grant(owner, cap), (sig) => ({ text: `Granted. The agent may spend up to ${cap} dUSDC.`, sig })),
      cap: () => owner && run(() => testCap(owner), (r) => ({ tone: 'up', text: `Cap held. The agent tried to move ${r.tried} dUSDC with ${r.left.toFixed(0)} approved, and the token program refused (${r.message.replace('Program log: ', '')}). Nothing moved.`, sig: r.sig })),
      revoke: () => owner && run(() => revoke(owner), (sig) => ({ tone: 'warn', text: 'Revoked. The agent can move nothing now.', sig })),
      look: async () => owner && setLook(await agentLook(owner)),
      'shift-dip': () => owner && run(() => buyShift(owner, 'dip'), (sig) => ({ text: 'Dip Buyer is on for 24 hours, paid in SKR.', sig })),
      'shift-night': () => owner && run(() => buyShift(owner, 'nightShift'), (sig) => ({ text: 'Night Shift is on for 24 hours, paid in SKR.', sig })),
    },
    !!owner && !!live.view,
  );

  const trail = activity.filter((a) => ['grant', 'revoke', 'buy', 'sell', 'refused', 'look', 'shift'].includes(a.kind)).slice(0, 12);

  return (
    <Screen gutter="none">
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.s44, gap: space.s16 }}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} tintColor={colors.ink55} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.s8 }}>
          <Text variant="screenTitle">Your agent</Text>
          <DevnetPill />
        </View>

        <Card style={{ alignItems: 'center', paddingVertical: space.s22 }}>
          <AgentOrb gradient={colors.agent.momentum} size={104} bloom face identity="xorr-clockin" status={perm.live ? 'active' : 'paused'} />
          <Text variant="titleLg" style={{ marginTop: space.s14 }}>
            {perm.live ? 'Working inside your permission' : 'Waiting for a permission'}
          </Text>
          <Text variant="bodySm" color={colors.ink55} align="center" style={{ marginTop: space.s6 }}>
            {perm.live
              ? `It may spend ${usd(perm.leftUsd)} more dUSDC — the token program stops it there — and sell what it bought.`
              : 'It reads the market and tells you what it would do. It can move nothing until you sign a permission.'}
          </Text>
          {live.agent ? (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: space.s8 }}>
              <Text variant="footnote" color={colors.ink38}>
                Agent key (on this phone):
              </Text>
              <AddressLink address={live.agent} />
            </View>
          ) : null}
        </Card>

        {note ? (
          <View style={{ gap: 4 }}>
            <Banner text={note.text} tone={note.tone} />
            <TxLink sig={note.sig} />
          </View>
        ) : null}

        {/* The permission. */}
        <Card testID="permission">
          <Eyebrow>The permission · SPL delegate on devnet</Eyebrow>
          {perm.live ? (
            <>
              <Text variant="amountLg">{usd(perm.leftUsd)}</Text>
              <Text variant="footnote" color={colors.ink45}>
                left of what you approved · enforced by the token program, not by xorr
              </Text>
              <View style={{ flexDirection: 'row', gap: space.s10, marginTop: space.s16 }}>
                <Button
                  label="Test the cap"
                  variant="secondary"
                  loading={busy === 'Testing the cap'}
                  disabled={!!busy}
                  onPress={() =>
                    run(
                      () => (owner ? testCap(owner) : Promise.reject(new Error('No wallet'))),
                      (r) => ({ tone: 'up', text: `Cap held. The agent tried to move ${r.tried} dUSDC with ${r.left.toFixed(0)} approved, and the token program refused (${r.message.replace('Program log: ', '')}). Nothing moved.`, sig: r.sig }),
                    )
                  }
                  style={{ flex: 1 }}
                  testID="test-cap"
                />
                <Button
                  label="Revoke"
                  variant="destructive"
                  loading={busy === 'Revoking'}
                  disabled={!!busy}
                  onPress={() => {
                    killTap();
                    Alert.alert('Revoke the permission?', 'One signature. The agent will not be able to move anything, stop-losses included, until you grant again.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Revoke',
                        style: 'destructive',
                        onPress: () => run(() => (owner ? revoke(owner) : Promise.reject(new Error('No wallet'))), (sig) => ({ tone: 'warn', text: 'Revoked. The agent can move nothing now.', sig })),
                      },
                    ]);
                  }}
                  style={{ flex: 1 }}
                  testID="revoke"
                />
              </View>
            </>
          ) : (
            <>
              <Text variant="bodySm" color={colors.ink70}>
                Approve the agent's key to spend up to:
              </Text>
              <View style={{ flexDirection: 'row', gap: space.s8, marginTop: space.s12 }}>
                {CAPS.map((c) => (
                  <Press
                    key={c}
                    onPress={() => setCap(c)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: cap === c }}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: radius.tile,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: cap === c ? colors.ink : colors.control,
                    }}
                  >
                    <Text variant="value" color={cap === c ? colors.bg : colors.ink}>
                      {c} dUSDC
                    </Text>
                  </Press>
                ))}
              </View>
              <Button
                label={`Sign permission · ${cap} dUSDC`}
                loading={busy === 'Granting the permission'}
                disabled={!!busy || st.cashUsd <= 0}
                onPress={() => {
                  heavyTap();
                  run(() => (owner ? grant(owner, cap) : Promise.reject(new Error('No wallet'))), (sig) => ({ text: `Granted. The agent may spend up to ${cap} dUSDC.`, sig }));
                }}
                style={{ marginTop: space.s14 }}
                testID="grant"
              />
              <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s10 }}>
                One transaction you sign: ApproveChecked on your dUSDC for the cap, and on each stock so its exits can sell
                while you are away. Revoke any time.
              </Text>
            </>
          )}
        </Card>

        {/* The look. */}
        <Card>
          <Eyebrow>Ask it to look now</Eyebrow>
          <Text variant="bodySm" color={colors.ink70}>
            The same cycle it runs after every clock-in: exits first, then the guard, then each strategy, one entry per stock
            per day, at most {usd(perTrade, 0)} a trade.
          </Text>
          <View style={{ flexDirection: 'row', gap: space.s8, marginTop: space.s12 }}>
            {SIZES.map((n) => (
              <Press
                key={n}
                onPress={() => set({ perTradeUsd: n })}
                accessibilityRole="radio"
                accessibilityState={{ selected: perTrade === n }}
                style={{ flex: 1, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: perTrade === n ? colors.ink : colors.control }}
              >
                <Text variant="control" color={perTrade === n ? colors.bg : colors.ink}>
                  ${n} a trade
                </Text>
              </Press>
            ))}
          </View>
          <Button
            label={busy === 'Agent is looking' ? 'Looking…' : 'Look now'}
            loading={busy === 'Agent is looking'}
            disabled={!!busy}
            onPress={async () => {
              if (!owner) return;
              setNote(null);
              try {
                const r = await agentLook(owner);
                successTap();
                setLook(r);
              } catch (e) {
                warningTap();
                setNote({ tone: 'down', text: (e as Error).message });
              }
            }}
            style={{ marginTop: space.s14 }}
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
        </Card>

        {/* Strategies, by tier or by SKR shift. */}
        <Card>
          <Eyebrow color={SKR_GOLD}>Strategies · {st.tier.name} tier</Eyebrow>
          {(Object.keys(STRATEGY_INFO) as StrategyId[]).map((id) => {
            const on = st.strategies.includes(id);
            const included = st.tier.strategies.includes(id);
            const pass = passes[id];
            const passLive = !!pass && pass.until > Date.now();
            return (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? colors.up : colors.switchOff }} />
                <View style={{ flex: 1 }}>
                  <Text variant="rowPrimary">{STRATEGY_INFO[id].name}</Text>
                  <Text variant="footnote" color={colors.ink45}>
                    {STRATEGY_INFO[id].line}
                  </Text>
                  <Text variant="footnoteSm" color={on ? colors.up : colors.ink38}>
                    {included ? `Included in ${st.tier.name}` : passLive ? `Hired until ${new Date(pass!.until).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Off'}
                  </Text>
                </View>
                {!included && !passLive ? (
                  <Button
                    label={`${SHIFT_PRICE[id]} dSKR · 24h`}
                    variant="secondary"
                    height={38}
                    disabled={!!busy}
                    loading={busy === 'Paying the shift'}
                    onPress={() =>
                      run(
                        () => (owner ? buyShift(owner, id) : Promise.reject(new Error('No wallet'))),
                        (sig) => ({ text: `${STRATEGY_INFO[id].name} is on for 24 hours, paid in SKR.`, sig }),
                      )
                    }
                    testID={`shift-${id}`}
                  />
                ) : null}
              </View>
            );
          })}
          <Text variant="footnoteSm" color={colors.ink32} style={{ marginTop: space.s6 }}>
            Hire a strategy's shift with SKR (devnet stand-in), or hold enough SKR for a tier that includes it.
          </Text>
        </Card>

        {/* The trail. */}
        <Card>
          <Eyebrow>Trail · every action on devnet</Eyebrow>
          {trail.length ? (
            trail.map((a) => (
              <View key={a.id} style={{ paddingVertical: space.s8, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                <Text variant="rowPrimary" color={a.ok ? colors.ink : colors.down}>
                  {a.title}
                </Text>
                {a.detail ? (
                  <Text variant="footnote" color={colors.ink45}>
                    {a.detail}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="footnoteSm" color={colors.ink32}>
                    {new Date(a.at).toLocaleString()}
                  </Text>
                  <TxLink sig={a.sig} label="Explorer" />
                </View>
              </View>
            ))
          ) : (
            <Text variant="bodySm" color={colors.ink45}>
              Nothing yet.
            </Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}
