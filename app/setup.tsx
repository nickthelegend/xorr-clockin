/**
 * First run, part two — the guided first grant, in xorr's delegate-screen style. Three steps on one screen:
 *   1. pick a cap and sign the permission,
 *   2. watch the agent make its first buy (a small one, so the receipt is real),
 *   3. ask it to overspend and watch devnet refuse — the cap is the chain's, not ours.
 * Skippable at every step; finished or skipped, it never shows again for this wallet (`firstRunDone`).
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ConsequenceCard, Fill, Progress, Screen, SheetCard, Stepper, Text, TransactionRef, colors, money, radius, space } from '@/ui';
import { Rise } from '@/ui/Rise';
import { selectionTick, successTap, warningTap } from '@/ui/haptics';
import { FailureNote } from '@/ui/States';
import { useAutopilot } from '@/clockin/autopilot';
import { agentLook, friendlyError, grant, testCap, type TradeResult } from '@/clockin/desk';
import { useClockin } from '@/clockin/session';
import { useDesk } from '@/clockin/useDesk';
import { signedPct, usd } from '@/clockin/ui';
import { explorerTx } from '@/clockin/config';

const CAPS = [25, 50, 100, 250];
const FIRST_BUY_USD = 10;

type Step = 'grant' | 'buy' | 'cap' | 'done';

export default function Setup() {
  const router = useRouter();
  const { owner, live, st } = useDesk();
  const set = useClockin((s) => s.set);
  const [capIndex, setCapIndex] = useState(2);
  const cap = CAPS[capIndex]!;
  const [step, setStep] = useState<Step>(st.permission.live ? 'buy' : 'grant');
  const [grantSig, setGrantSig] = useState<string>();
  const [buy, setBuy] = useState<TradeResult | null>(null);
  const [refusal, setRefusal] = useState<{ sig: string; tried: number; left: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = live.busy;

  // The first buy is the day's strongest mover, so the receipt has a reason a person recognises.
  const pick = useMemo(() => {
    const qs = Object.values(live.prices?.quotes ?? {}).filter((q) => q.change24h !== null);
    return qs.sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))[0];
  }, [live.prices]);

  function done(skipped: boolean) {
    set({ firstRunDone: true });
    if (skipped) router.replace('/');
    else router.replace('/');
  }

  async function doGrant() {
    if (!owner) return;
    setError(null);
    selectionTick();
    try {
      setGrantSig(await grant(owner, cap));
      successTap();
      setStep('buy');
    } catch (e) {
      warningTap();
      setError(friendlyError(e));
    }
  }

  async function doBuy() {
    if (!owner || !pick) return;
    setError(null);
    try {
      const [r] = await agentLook(owner, { symbol: pick.symbol, usd: FIRST_BUY_USD });
      if (r?.error) throw new Error(r.error);
      setBuy(r ?? null);
      successTap();
      setStep('cap');
    } catch (e) {
      warningTap();
      setError(friendlyError(e));
    }
  }

  async function doCap() {
    if (!owner) return;
    setError(null);
    try {
      const r = await testCap(owner);
      setRefusal(r);
      successTap();
      setStep('done');
    } catch (e) {
      warningTap();
      setError(friendlyError(e));
    }
  }

  useAutopilot({ grant: doGrant, buy: doBuy, cap: doCap, finish: () => done(false), skip: () => done(true) }, !!owner && !!live.view && !!live.prices);

  const index = { grant: 1, buy: 2, cap: 3, done: 3 }[step];
  const title = {
    grant: 'Give your agent a cap',
    buy: 'Let it make its first buy',
    cap: 'Now try to break the cap',
    done: 'You’re set up',
  }[step];
  const lead = {
    grant: 'One signature. The token program stops the agent at this amount — whatever xorr does.',
    buy: `A small one, so you can see a real receipt: ${usd(FIRST_BUY_USD, 0)} of today’s strongest mover.`,
    cap: 'Ask the agent to move more than you approved. Devnet should refuse it.',
    done: 'Clock in every morning: read the brief, keep the streak, collect SKR.',
  }[step];

  return (
    <Screen>
      <Progress step={index} total={3} onBack={() => done(true)} />
      <Rise index={0} key={step}>
        <Text variant="onboardingTitle" style={{ marginTop: space.s26 }} accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" color={colors.ink55} style={{ marginTop: space.s10 }}>
          {lead}
        </Text>
      </Rise>

      <Fill style={{ marginTop: space.s22 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space.s10, paddingBottom: space.s16 }}>
          {error ? <FailureNote error={new Error(error)} /> : null}

          {step === 'grant' ? (
            <>
              <ConsequenceCard tone="up" label="It can buy up to your cap" detail="Tokenized US stocks — devnet stand-ins at live prices." />
              <ConsequenceCard tone="down" label="It cannot withdraw" detail="Only buys and sells, from your own wallet." />
              <ConsequenceCard tone="up" label="You can take it back in one tap" detail="Hold Stop all trading on Your agent." />
              <SheetCard borderRadius={radius.panel} padding={space.s16} style={{ marginTop: space.s8 }}>
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
                <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s8 }}>
                  You hold {usd(st.cashUsd)} of test dUSDC.
                </Text>
              </SheetCard>
            </>
          ) : null}

          {grantSig ? (
            <Rise index={1}>
              <ConsequenceCard tone="up" label={`Permission signed · ${usd(cap, 0)}`} detail="An SPL ApproveChecked on your dUSDC, on Solana devnet." />
              <View style={{ alignSelf: 'flex-end', marginTop: space.s4 }}>
                <TransactionRef explorer={explorerTx(grantSig)} />
              </View>
            </Rise>
          ) : null}

          {step === 'buy' && pick ? (
            <SheetCard borderRadius={radius.panel} padding={space.s16}>
              <Text variant="rowPrimary">{pick.symbol}</Text>
              <Text variant="footnote" color={colors.ink45}>
                {usd(pick.usd)} · {pick.change24h != null ? `${signedPct(pick.change24h)} today` : 'no change today'}
              </Text>
            </SheetCard>
          ) : null}

          {buy?.sig ? (
            <Rise index={1}>
              <ConsequenceCard tone="up" label={`Bought ${usd(buy.decision.usd ?? 0)} of ${buy.decision.symbol}`} detail="The agent moved dUSDC as your delegate; the stand-in landed in your wallet." />
              <View style={{ alignSelf: 'flex-end', marginTop: space.s4 }}>
                <TransactionRef explorer={explorerTx(buy.sig)} />
              </View>
            </Rise>
          ) : null}

          {refusal ? (
            <Rise index={1}>
              <ConsequenceCard
                tone="up"
                label="Refused on chain"
                detail={`The agent tried ${usd(refusal.tried, 0)} with ${usd(refusal.left, 0)} approved. The token program said no; nothing moved.`}
              />
              <View style={{ alignSelf: 'flex-end', marginTop: space.s4 }}>
                <TransactionRef explorer={explorerTx(refusal.sig)} />
              </View>
            </Rise>
          ) : null}
        </ScrollView>
      </Fill>

      {step === 'grant' ? (
        <Button label={busy ? 'Signing…' : `Sign permission · ${usd(cap, 0)}`} loading={!!busy} disabled={st.cashUsd <= 0 && !!live.view} onPress={doGrant} testID="setup-grant" />
      ) : step === 'buy' ? (
        <Button label={busy ? 'Buying…' : `Buy ${usd(FIRST_BUY_USD, 0)} of ${pick?.symbol ?? '…'}`} loading={!!busy} disabled={!pick} onPress={doBuy} testID="setup-buy" />
      ) : step === 'cap' ? (
        <Button label={busy ? 'Trying…' : 'Test the cap'} loading={!!busy} onPress={doCap} testID="setup-cap" />
      ) : (
        <Button label="Go to Home" onPress={() => done(false)} testID="setup-done" />
      )}
      {step !== 'done' ? (
        <Button label="Not now — look around first" variant="ghost" onPress={() => done(true)} style={{ marginTop: space.s10 }} testID="setup-skip" />
      ) : null}
    </Screen>
  );
}
