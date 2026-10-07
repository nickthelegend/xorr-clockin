/**
 * Safety (CLOCK IN build) — the permission, and nothing else, in xorr's Safety layout: the state chip, the title and one
 * sentence from the chain; the cap as two rings; your wallet and the agent's key; Test the cap; and one button pinned at
 * the bottom — sign the permission, or hold to stop all trading (an SPL revoke, behind xorr's stop curtain).
 *
 * The agents (look now, hire a shift) live on their own pages (`/agent/[id]`), the trail on Activity.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/nav/useGoBack';
import { Icon } from '@/design/Icon';
import {
  BackButton,
  Button,
  ConsequenceCard,
  Eyebrow,
  Fill,
  HoldButton,
  Ring,
  Row,
  Screen,
  SheetCard,
  Stepper,
  StopCurtain,
  Text,
  TransactionRef,
  colors,
  money,
  radius,
  size,
  space,
  type StopState,
} from '@/ui';
import { FailureNote } from '@/ui/States';
import { selectionTick, successTap, warningTap } from '@/ui/haptics';
import { useAutopilot, useScrollAutopilot } from '@/clockin/autopilot';
import { explorerAddress, explorerTx } from '@/clockin/config';
import { agentLook, buyShift, friendlyError, grant, revoke, testCap } from '@/clockin/desk';
import { useClockin } from '@/clockin/session';
import { useDesk } from '@/clockin/useDesk';
import { openUrl, usd } from '@/clockin/ui';

const CAPS = [25, 50, 100, 250];
const DOT = 7;
const SETTING_ROW = 52;

export default function Desk() {
  const goBack = useGoBack('/');
  const router = useRouter();
  const { owner, live, st } = useDesk();
  const scroller = useScrollAutopilot();
  const activity = useClockin((s) => s.activity);
  const [capIndex, setCapIndex] = useState(2);
  const cap = CAPS[capIndex]!;
  const [outcome, setOutcome] = useState<{ tone: 'up' | 'down' | 'warn'; label: string; detail: string; sig?: string } | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [stopping, setStopping] = useState<StopState>();
  const [stopSig, setStopSig] = useState<string>();
  const busy = live.busy;
  const perm = st.permission;
  const lastPermissionEvent = activity.find((a) => a.kind === 'grant' || a.kind === 'revoke')?.kind;
  const lastGrant = activity.find((a) => a.kind === 'grant');
  const grantedCap = lastGrant ? Number(/([\d.]+) dUSDC/.exec(lastGrant.title)?.[1] ?? 0) : 0;
  const used = perm.live && grantedCap > 0 ? Math.max(0, Math.min(1, (grantedCap - perm.leftUsd) / grantedCap)) : undefined;
  const unreadable = !!live.error && !live.view;

  async function run(fn: () => Promise<{ tone?: 'up' | 'down' | 'warn'; label: string; detail: string; sig?: string }>) {
    if (!owner) return;
    setOutcome(null);
    setFailure(null);
    try {
      const o = await fn();
      successTap();
      setOutcome({ tone: o.tone ?? 'up', label: o.label, detail: o.detail, sig: o.sig });
    } catch (e) {
      warningTap();
      setFailure(new Error(friendlyError(e)));
    }
  }

  const doGrant = () => {
    selectionTick();
    return run(async () => {
      const sig = await grant(owner!, cap);
      return { label: `Permission signed · ${usd(cap, 0)}`, detail: 'Your agent can buy up to this much. The token program stops it there.', sig };
    });
  };
  const doCap = () => {
    selectionTick();
    return run(async () => {
      const r = await testCap(owner!);
      return {
        label: 'The cap held',
        detail: `Your agent tried to move ${usd(r.tried, 0)} with ${usd(r.left, 0)} approved. The chain refused it; nothing moved.`,
        sig: r.sig,
      };
    });
  };
  async function doRevoke() {
    if (!owner) return;
    setOutcome(null);
    setFailure(null);
    setStopping('signing');
    try {
      setStopSig(await revoke(owner));
      setStopping('stopped');
    } catch (e) {
      setStopping(undefined);
      warningTap();
      setFailure(new Error(friendlyError(e)));
    }
  }

  useAutopilot(
    {
      grant: () => owner && doGrant(),
      cap: () => owner && doCap(),
      revoke: () => doRevoke(),
      // Kept for the screenshot runs that drive the agent from here.
      look: () => owner && agentLook(owner),
      'shift-dip': () => owner && buyShift(owner, 'dip'),
      'shift-night': () => owner && buyShift(owner, 'nightShift'),
    },
    !!owner && !!live.view,
  );

  const state = unreadable ? 'Unknown' : perm.live ? 'Live' : lastPermissionEvent === 'revoke' ? 'Stopped' : lastPermissionEvent === 'grant' ? 'Spent' : 'Not granted';
  const title = unreadable
    ? 'Couldn’t read your permission'
    : perm.live
      ? 'Trading is live'
      : lastPermissionEvent === 'revoke'
        ? 'Trading is stopped'
        : lastPermissionEvent === 'grant'
          ? 'The allowance is spent'
          : 'Give your agent a permission';
  const sentence = unreadable
    ? 'Anything you granted stays in force. Pull to try again.'
    : perm.live
      ? `Your agent can spend ${usd(perm.leftUsd)} more, and sell what it bought. Nothing past that.`
      : lastPermissionEvent === 'revoke'
        ? 'Your agent can move nothing. Grant again whenever you want it back.'
        : 'It watches the market and tells you what it would do. It can move nothing until you sign.';
  const dot = unreadable ? colors.ink30 : perm.live ? colors.up : colors.ink30;
  const lastRow = !perm.live;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s8 }}>
        <BackButton onPress={() => goBack()} />
        <Text variant="screenTitle">Safety</Text>
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
        <View style={{ width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: dot }} />
        <Text variant="tagSm" color={perm.live && !unreadable ? colors.up : colors.ink55}>
          {state}
        </Text>
      </View>
      <Text variant="onboardingTitle" style={{ marginTop: space.s16 }} accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" color={colors.ink55} style={{ marginTop: space.s8 }}>
        {sentence}
      </Text>

      <Fill style={{ marginTop: space.s20 }}>
        <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.s16, gap: space.s12 }}>
          {failure ? <FailureNote error={failure} /> : null}
          {outcome ? (
            <View style={{ gap: space.s4 }}>
              <ConsequenceCard tone={outcome.tone} label={outcome.label} detail={outcome.detail} />
              {outcome.sig ? (
                <View style={{ alignSelf: 'flex-end' }}>
                  <TransactionRef explorer={explorerTx(outcome.sig)} />
                </View>
              ) : null}
            </View>
          ) : null}

          {perm.live ? (
            <SheetCard borderRadius={radius.panel} padding={space.s16}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <Ring fraction={used} value={used === undefined ? '—' : `${Math.round(used * 100)}%`} label="Cap used" />
                <Ring fraction={grantedCap > 0 ? perm.leftUsd / grantedCap : undefined} value={usd(perm.leftUsd, 0)} label="Left to spend" />
              </View>
            </SheetCard>
          ) : unreadable ? null : (
            <SheetCard borderRadius={radius.panel} padding={space.s16} testID="permission">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12 }}>
                <Text variant="rowPrimary">Most it can spend</Text>
                <Stepper
                  value={money(cap, { decimals: 0 })}
                  onDecrement={() => setCapIndex(Math.max(0, capIndex - 1))}
                  onIncrement={() => setCapIndex(Math.min(CAPS.length - 1, capIndex + 1))}
                  canDecrement={capIndex > 0}
                  canIncrement={capIndex < CAPS.length - 1}
                />
              </View>
              <Text variant="footnote" color={colors.ink55} style={{ marginTop: space.s10 }}>
                {`Test dUSDC in your wallet: ${usd(st.cashUsd)}.`}
              </Text>
            </SheetCard>
          )}

          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Row
              title="Your wallet"
              value={
                <Text variant="rowPrimary" color={colors.ink55} selectable>
                  {owner ? `${owner.address.slice(0, 4)}…${owner.address.slice(-4)}` : '—'}
                </Text>
              }
              onPress={owner ? () => openUrl(explorerAddress(owner.address)) : undefined}
              height={SETTING_ROW}
            />
            <Row
              title="Agent key"
              secondary={
                <Text variant="secondarySm" color={colors.ink38} numberOfLines={2} style={{ marginTop: space.s2 }}>
                  On this phone · can spend your approved dUSDC and sell your stock tokens, nothing else
                </Text>
              }
              value={
                <Text variant="rowPrimary" color={colors.ink55} selectable>
                  {live.agent ? `${live.agent.slice(0, 4)}…${live.agent.slice(-4)}` : '—'}
                </Text>
              }
              onPress={live.agent ? () => openUrl(explorerAddress(live.agent!)) : undefined}
              height={size.rowLg}
              divider={!lastRow}
            />
            {perm.live ? (
              <Row
                title="Test the cap"
                secondary="Ask your agent to overspend, and watch the chain refuse"
                onPress={busy ? undefined : doCap}
                right={<Icon name="chevron" size={16} color={colors.ink28} />}
                height={size.rowLg}
                divider={false}
                testID="test-cap"
              />
            ) : null}
          </SheetCard>

          <SheetCard borderRadius={radius.panel} padding={space.s16}>
            <Eyebrow small>Your agent</Eyebrow>
            <Row title="Agents and shifts" secondary="Look now, or hire a strategy for a day with SKR" onPress={() => router.push('/agent/momentum')} right={<Icon name="chevron" size={16} color={colors.ink28} />} height={size.rowLg} />
            <Row title="Activity" secondary="Every grant, trade and refusal, with its transaction" onPress={() => router.push('/activity')} right={<Icon name="chevron" size={16} color={colors.ink28} />} height={size.rowLg} divider={false} />
          </SheetCard>
        </ScrollView>
      </Fill>

      {perm.live ? (
        <>
          <HoldButton label="Stop all trading" accessibilityHint="Hold to stop" height={size.buttonLg} loading={busy === 'Revoking'} onCommit={() => void doRevoke()} testID="revoke" />
          <Text variant="footnote" color={colors.ink55} align="center" style={{ marginTop: space.s12 }}>
            Stops all trading, stop-losses too. Your funds stay in your wallet.
          </Text>
        </>
      ) : unreadable ? null : (
        <>
          <Button
            label={busy === 'Granting the permission' ? 'Signing…' : `Sign permission · ${usd(cap, 0)}`}
            height={size.buttonLg}
            loading={busy === 'Granting the permission'}
            disabled={!!busy || st.cashUsd <= 0}
            onPress={doGrant}
            testID="grant"
          />
          <Text variant="footnote" color={colors.ink55} align="center" style={{ marginTop: space.s12 }}>
            You’ll sign once. Take it back any time from here.
          </Text>
        </>
      )}
      <StopCurtain
        state={stopping}
        detail="Your agent can move nothing now."
        signature={stopSig}
        onDone={() => setStopping(undefined)}
      />
    </Screen>
  );
}
