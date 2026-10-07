/**
 * Profile (CLOCK IN build), in xorr's profile + settings patterns: the avatar, the name and the copyable address; a card
 * of places; then settings sections — Reminders (the morning brief at a chosen time and the evening streak reminder,
 * read back from what the OS actually scheduled), Wallet, Activity, About, Legal — and, folded away under Advanced,
 * the optional AI key.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { Icon, type IconName } from '@/design/Icon';
import { quantity, BackButton, Button, ConsequenceCard, Eyebrow, Field, Press, Row, Screen, SheetCard, SwitchRow, Tag, Text, TransactionRef, colors, radius, size, space } from '@/ui';
import { FailureNote } from '@/ui/States';
import { Rise } from '@/ui/Rise';
import { selectionTick, successTap, warningTap } from '@/ui/haptics';
import { useGoBack } from '@/nav/useGoBack';
import { DEVNET, STOCKS, explorerAddress, explorerTx } from '@/clockin/config';
import { feeMode, forgetAgent, friendlyError, getDevnetSol, settleDesk, syncRemindersNow, useLive } from '@/clockin/desk';
import { clearAiKey, getAiKey, setAiKey } from '@/clockin/ai';
import { useAutopilot, useScrollAutopilot } from '@/clockin/autopilot';
import { forgetDevice } from '@/clockin/forget';
import { mwaDisconnect } from '@/clockin/mwa';
import { usePrivySolana } from '@/clockin/privySign';
import { scheduledReminders } from '@/clockin/notify';
import { useClockin } from '@/clockin/session';
import { useDesk } from '@/clockin/useDesk';
import { openUrl } from '@/clockin/ui';
import { WALLET_LABEL } from '@/clockin/useOwner';

const AVATAR = 84;
const LINK_GLYPH = 17;
const TIMES = [
  { hour: 7, minute: 0 },
  { hour: 8, minute: 30 },
  { hour: 10, minute: 0 },
];
const hhmm = (t: { hour: number; minute: number }) => `${t.hour}:${String(t.minute).padStart(2, '0')}`;

const LINKS: { label: string; href: '/desk' | '/skr' | '/ask'; icon: IconName }[] = [
  { label: 'Your agent', href: '/desk', icon: 'shield' },
  { label: 'SKR', href: '/skr', icon: 'sparkle' },
  { label: 'Ask your agent', href: '/ask', icon: 'chat' },
];

export default function Me() {
  const router = useRouter();
  const goBack = useGoBack('/');
  const { owner, live } = useDesk();
  const scroller = useScrollAutopilot();
  const wallet = useClockin((s) => s.wallet);
  const activity = useClockin((s) => s.activity);
  const aiModel = useClockin((s) => s.aiModel);
  const remindersOn = useClockin((s) => s.remindersOn);
  const briefAt = useClockin((s) => s.briefAt);
  const streakReminderOn = useClockin((s) => s.streakReminderOn ?? s.remindersOn);
  const set = useClockin((s) => s.set);
  const disconnect = useClockin((s) => s.disconnect);
  const [hasKey, setHasKey] = useState(false);
  const [key, setKey] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const [allActivity, setAllActivity] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduled, setScheduled] = useState<{ brief: boolean; streakAt: Date | null }>({ brief: false, streakAt: null });
  const [msg, setMsg] = useState<{ text: string; tone: 'up' | 'down' | 'warn'; sig?: string } | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<unknown>(null);
  const privy = usePrivySolana();

  useEffect(() => {
    void getAiKey().then((k) => setHasKey(!!k));
  }, []);
  const readScheduled = useCallback(() => {
    void scheduledReminders().then(setScheduled);
  }, []);
  useFocusEffect(readScheduled);

  async function setStreakReminder(on: boolean) {
    set({ streakReminderOn: on });
    const ok = await syncRemindersNow(on);
    if (on && !ok) {
      set({ streakReminderOn: false });
      warningTap();
      setMsg({ tone: 'warn', text: 'Notifications are off for xorr. Turn them on in Settings → Notifications, then try again.' });
    } else if (on) successTap();
    readScheduled();
  }
  async function setReminders(on: boolean, at = briefAt) {
    set({ remindersOn: on, briefAt: at, streakReminderOn: useClockin.getState().streakReminderOn ?? on });
    const ok = await syncRemindersNow(on);
    if (on && !ok) {
      set({ remindersOn: false });
      warningTap();
      setMsg({ tone: 'warn', text: 'Notifications are off for xorr. Turn them on in Settings → Notifications, then try again.' });
    } else if (on) successTap();
    readScheduled();
  }

  async function onDisconnect() {
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const mwa = wallet?.mwa;
      // Let any setup in flight finish, end the session so nothing new starts for this wallet, then delete the keys.
      await settleDesk();
      disconnect();
      useLive.setState({ view: null, mainnetSkr: null, sgt: undefined, error: null, setupFailed: false });
      forgetAgent();
      await forgetDevice({
        deauthorizeWallet: mwa ? () => mwaDisconnect(mwa) : undefined,
        privyLogout: privy.signedIn ? privy.logout : undefined,
      });
      router.replace('/start');
    } catch (e) {
      warningTap();
      setDisconnectError(new Error(`Couldn’t finish disconnecting: ${friendlyError(e)}`));
    } finally {
      setDisconnecting(false);
    }
  }
  useAutopilot({
    disconnect: onDisconnect,
    'disconnect-confirm': () => setConfirmingDisconnect(true),
    advanced: () => setAdvanced(true),
    tokens: () => setTokensOpen(true),
    reminders: () => setReminders(true),
    'reminders-force': async () => {
      set({ remindersOn: true, briefAt: { hour: 8, minute: 30 } });
      await syncRemindersNow(false, true);
      readScheduled();
    },
  });

  const address = owner?.address;
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : undefined;
  const name = wallet ? (wallet.kind === 'guest' ? 'Guest wallet' : (wallet.label ?? WALLET_LABEL[wallet.kind])) : 'No wallet';
  const initial = wallet?.kind === 'mwa' ? 'S' : wallet?.kind === 'privy' ? 'P' : 'G';
  const kindLine =
    wallet?.kind === 'mwa'
      ? 'Signs over Mobile Wallet Adapter — Seed Vault on a Seeker. xorr never sees its key.'
      : wallet?.kind === 'privy'
        ? 'Privy’s embedded wallet, unlocked by your email. xorr never sees its key.'
        : 'A devnet-only key kept in this phone’s keystore. Use Seed Vault for anything real.';
  const shown = allActivity ? activity.slice(0, 40) : activity.slice(0, 5);
  // What the OS actually holds: "Tonight at 20:00" or "Tomorrow at 20:00" (tomorrow once today's clock-in is done).
  const streakWhen = scheduled.streakAt
    ? `${scheduled.streakAt.toDateString() === new Date().toDateString() ? 'Tonight' : 'Tomorrow'} at ${scheduled.streakAt.getHours()}:00`
    : 'At 20:00';


  return (
    <Screen gutter="none">
      <View style={{ flexDirection: 'row', paddingHorizontal: space.gutter }}>
        <BackButton onPress={() => goBack()} />
      </View>

      <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.s44 }} keyboardShouldPersistTaps="handled">
        <Rise index={0} style={{ alignItems: 'center', marginTop: space.s6, paddingHorizontal: space.gutter }}>
          <View style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="screenTitle" color={colors.sheet.ink}>
              {initial}
            </Text>
          </View>
          <Text variant="screenTitle" align="center" numberOfLines={1} style={{ marginTop: space.s16 }}>
            {name}
          </Text>
          <Tag label="Devnet" tone="warn" small style={{ marginTop: space.s8, alignSelf: 'center' }} />
          {address && short ? (
            <Press
              onPress={async () => {
                await Clipboard.setStringAsync(address);
                selectionTick();
                setCopied(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Address copied' : `Copy address ${address}`}
              hitHeight={size.hit}
              style={{
                marginTop: space.s12,
                height: size.pillH,
                paddingHorizontal: size.pillPadX,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.s8,
                borderRadius: radius.full,
                backgroundColor: colors.control,
              }}
            >
              <Text variant="secondarySm" color={colors.ink65}>
                {copied ? 'Copied' : short}
              </Text>
              <Icon name={copied ? 'check' : 'copy'} size={15} color={colors.ink55} />
            </Press>
          ) : null}
        </Rise>

        <Rise index={1} style={{ marginTop: space.s26, marginHorizontal: space.gutter, paddingHorizontal: space.s16, borderRadius: radius.panel, backgroundColor: colors.surfaceAlt }}>
          {LINKS.map((link, i) => (
            <Row
              key={link.href}
              divider={i < LINKS.length - 1}
              onPress={() => router.push(link.href)}
              left={
                <View style={{ width: size.mark, height: size.mark, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.control }}>
                  <Icon name={link.icon} size={LINK_GLYPH} color={colors.ink65} />
                </View>
              }
              title={link.label}
              right={<Icon name="chevron" size={16} color={colors.ink28} />}
            />
          ))}
        </Rise>
        <Text variant="footnote" color={colors.ink55} align="center" style={{ marginTop: space.s14, paddingHorizontal: space.gutter }}>
          {kindLine}
        </Text>

        <View style={{ paddingHorizontal: space.gutter }}>
          {msg ? (
            <View style={{ marginTop: space.s16, gap: space.s4 }}>
              {msg.tone === 'up' ? <ConsequenceCard tone="up" label={msg.text} detail="Devnet test SOL, for network fees." /> : <FailureNote error={new Error(msg.text)} />}
              {msg.sig ? (
                <View style={{ alignSelf: 'flex-end' }}>
                  <TransactionRef explorer={explorerTx(msg.sig)} />
                </View>
              ) : null}
            </View>
          ) : null}

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Reminders
          </Eyebrow>
          <SwitchRow
            label="Morning brief"
            caption={(on) => (on ? `Every day at ${hhmm(briefAt)}, with your streak on the line` : 'Off — your agent still works; you just won’t be nudged')}
            on={remindersOn}
            onChange={(v) => void setReminders(v)}
            height={size.rowLg}
            testID="reminders-switch"
          />
          {remindersOn ? (
            <View style={{ flexDirection: 'row', gap: space.s8, paddingVertical: space.s12 }}>
              {TIMES.map((t) => {
                const on = t.hour === briefAt.hour && t.minute === briefAt.minute;
                return (
                  <Press
                    key={hhmm(t)}
                    onPress={() => void setReminders(true, t)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Brief at ${hhmm(t)}`}
                    style={{ flex: 1, minHeight: size.hit, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.ink : colors.control }}
                  >
                    <Text variant="control" color={on ? colors.bg : colors.ink}>
                      {hhmm(t)}
                    </Text>
                  </Press>
                );
              })}
            </View>
          ) : null}
          <SwitchRow
            label="Streak reminder"
            caption={(on) => (on ? `${streakWhen}, only if today’s clock-in is still open` : 'Off — no evening nudge before your streak lapses')}
            on={streakReminderOn}
            onChange={(v) => void setStreakReminder(v)}
            height={size.rowLg}
            testID="streak-switch"
          />

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Wallet
          </Eyebrow>
          <Row
            title="Type"
            value={
              <Text variant="rowPrimary" color={colors.ink55}>
                {wallet ? WALLET_LABEL[wallet.kind] : '—'}
              </Text>
            }
            height={size.row}
            divider
          />
          <Row
            title="Address"
            value={
              <Text variant="rowPrimary" color={colors.ink55} selectable>
                {short ?? '—'}
              </Text>
            }
            height={size.row}
            divider
            onPress={address ? () => openUrl(explorerAddress(address)) : undefined}
          />
          <Row
            title="Devnet SOL"
            secondary={live.view ? (feeMode(live.view) === 'faucet' ? 'You need none — xorr’s faucet pays fees' : 'xorr’s faucet is dry: you pay devnet fees') : undefined}
            value={<Text variant="rowPrimary">{live.view ? quantity(live.view.sol, 4) : '—'}</Text>}
            height={size.rowLg}
            divider={false}
          />
          <Button
            label={live.busy === 'Requesting devnet SOL' ? 'Requesting…' : 'Get 0.5 devnet SOL'}
            variant="ghost"
            loading={live.busy === 'Requesting devnet SOL'}
            onPress={async () => {
              if (!owner) return;
              try {
                const sig = await getDevnetSol(owner);
                successTap();
                setMsg({ tone: 'up', text: '+0.5 devnet SOL', sig });
              } catch (e) {
                warningTap();
                setMsg({ tone: 'warn', text: friendlyError(e) });
              }
            }}
            style={{ marginTop: space.s8 }}
          />

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Activity on devnet
          </Eyebrow>
          {shown.length ? (
            shown.map((a, i) => (
              <Row
                key={a.id}
                title={
                  <Text variant="rowPrimary" color={a.ok ? colors.ink : colors.down} numberOfLines={1}>
                    {a.title}
                  </Text>
                }
                secondary={new Date(a.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                right={a.sig ? <Icon name="chevron" size={16} color={colors.ink28} /> : undefined}
                onPress={a.sig ? () => openUrl(explorerTx(a.sig!)) : undefined}
                height={size.rowLg}
                divider={i < shown.length - 1}
              />
            ))
          ) : (
            <Text variant="body" color={colors.ink55} style={{ marginTop: space.s8 }}>
              Nothing yet. Your clock-ins, grants and the agent’s trades land here, each with its explorer link.
            </Text>
          )}
          {activity.length > 5 ? (
            <Button label={allActivity ? 'Show less' : `All ${Math.min(activity.length, 40)} entries`} variant="ghost" onPress={() => setAllActivity(!allActivity)} style={{ marginTop: space.s8 }} />
          ) : null}

          <Eyebrow small style={{ marginTop: space.s26 }}>
            About this build
          </Eyebrow>
          <Row
            title="Network"
            secondary="Test tokens only. Nothing here is real money."
            value={
              <Text variant="rowPrimary" color={colors.ink55}>
                Devnet · Solana
              </Text>
            }
            height={size.rowLg}
            divider
          />
          <Row
            title="Test tokens"
            secondary={`dUSDC, dSKR and ${STOCKS.length} stock stand-ins`}
            onPress={() => setTokensOpen(!tokensOpen)}
            right={
              <View style={{ transform: [{ rotate: tokensOpen ? '90deg' : '0deg' }] }}>
                <Icon name="chevron" size={16} color={colors.ink28} />
              </View>
            }
            height={size.rowLg}
            divider={false}
            testID="test-tokens"
          />
          {tokensOpen ? (
            <View style={{ gap: space.s10, paddingBottom: space.s6 }}>
              <Text variant="bodySm" color={colors.ink55}>
                {DEVNET.source === 'shared' ? 'Minted by xorr’s devnet faucet' : 'Created by this phone for itself'}, and filled at Jupiter’s live
                prices for the real xStocks. Tap one to see its mint on Solana Explorer.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 }}>
                {[
                  { label: 'dUSDC', addr: DEVNET.usdcMint },
                  { label: 'dSKR', addr: DEVNET.skrMint },
                  ...STOCKS.map((s) => ({ label: s.symbol, addr: s.devnetMint })),
                ].map((m) => (
                  <Press key={m.label} onPress={() => openUrl(explorerAddress(m.addr))} accessibilityRole="link" accessibilityLabel={`${m.label} mint, opens Solana Explorer`} hitHeight={size.hit}>
                    <Tag label={m.label} small />
                  </Press>
                ))}
              </View>
            </View>
          ) : null}

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Legal
          </Eyebrow>
          <Row title="Terms" height={size.row} divider onPress={() => router.push('/legal/terms' as never)} right={<Icon name="chevron" size={16} color={colors.ink28} />} />
          <Row title="Privacy policy" height={size.row} divider onPress={() => router.push('/legal/privacy' as never)} right={<Icon name="chevron" size={16} color={colors.ink28} />} />
          <Row title="Risk disclosure" height={size.row} divider={false} onPress={() => router.push('/legal/risk' as never)} right={<Icon name="chevron" size={16} color={colors.ink28} />} testID="legal-risk" />

          <Press
            onPress={() => setAdvanced(!advanced)}
            accessibilityRole="button"
            accessibilityState={{ expanded: advanced }}
            accessibilityLabel={`Advanced, ${advanced ? 'expanded' : 'collapsed'}`}
            hitHeight={size.hit}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s26, minHeight: size.hit }}
          >
            <Eyebrow small>Advanced</Eyebrow>
            <View style={{ transform: [{ rotate: advanced ? '90deg' : '0deg' }] }}>
              <Icon name="chevron" size={14} color={colors.ink40} />
            </View>
          </Press>
          {advanced ? (
            <View style={{ gap: space.s10 }}>
              <Text variant="bodySm" color={colors.ink55}>
                Ask your agent: without a key, your agent answers from its own rules and numbers, on this phone. With your own
                OpenRouter key, a model you choose answers instead. Each question then goes to OpenRouter with your agent’s brief,
                prices, holdings, cost, dUSDC cash and recent trades (not your wallet address). The morning brief and every trade
                decision stay on the agent’s own rules. The key itself stays in this phone’s keystore.
              </Text>
              {hasKey ? (
                <Row
                  title="OpenRouter key"
                  secondary="Saved in the keystore"
                  right={
                    <Button
                      label="Remove"
                      variant="ghost"
                      onPress={async () => {
                        await clearAiKey();
                        setHasKey(false);
                      }}
                    />
                  }
                  height={size.rowLg}
                  divider={false}
                />
              ) : (
                <>
                  <Field label="OpenRouter key" placeholder="sk-or-…" secure value={key} onChange={setKey} />
                  <Button
                    label="Save key"
                    variant="secondary"
                    disabled={key.trim().length < 10}
                    onPress={async () => {
                      await setAiKey(key);
                      setKey('');
                      setHasKey(true);
                      successTap();
                    }}
                  />
                </>
              )}
              <Field label="Model" placeholder="anthropic/claude-haiku-4.5" value={aiModel} onChange={(m) => set({ aiModel: m })} />
            </View>
          ) : null}

          <Eyebrow small style={{ marginTop: space.s26 }}>
            Session
          </Eyebrow>
          {confirmingDisconnect ? (
            <SheetCard borderRadius={radius.panel} padding={space.s16} style={{ marginTop: space.s8 }} testID="disconnect-confirm">
              <Text variant="cardTitle" accessibilityRole="header">
                Disconnect and delete this phone’s keys?
              </Text>
              <View style={{ gap: space.s6, marginTop: space.s10 }}>
                {[
                  wallet?.kind === 'guest'
                    ? 'Deletes the guest wallet’s key. Its devnet tokens can’t be reached again from any phone.'
                    : wallet?.kind === 'privy'
                      ? 'Signs you out of Privy. Your Privy wallet stays yours; sign in again with your email.'
                      : 'Ends this app’s session with your wallet app. Your wallet and its keys are untouched.',
                  'Deletes your agent’s key. A permission you granted stays on chain, but nothing can spend under it any more.',
                  'Deletes this phone’s devnet venue key and stand-in tokens, and your OpenRouter key if you added one.',
                  'Clears your streak and activity on this phone. Transactions already on chain stay there.',
                ].map((line) => (
                  <Text key={line} variant="bodySm" color={colors.ink55}>
                    {`· ${line}`}
                  </Text>
                ))}
              </View>
              {disconnectError ? <FailureNote error={disconnectError} style={{ marginTop: space.s10 }} /> : null}
              <Button
                label={disconnecting ? 'Disconnecting…' : 'Disconnect and delete keys'}
                variant="destructive"
                loading={disconnecting}
                disabled={disconnecting}
                onPress={() => void onDisconnect()}
                style={{ marginTop: space.s14 }}
                testID="disconnect-go"
              />
              <Button label="Keep everything" variant="ghost" disabled={disconnecting} onPress={() => setConfirmingDisconnect(false)} style={{ marginTop: space.s6 }} />
            </SheetCard>
          ) : (
            <Row
              title="Disconnect"
              secondary="Sign out and delete this phone’s keys. You’ll confirm first."
              height={size.rowLg}
              divider={false}
              onPress={() => {
                selectionTick();
                setConfirmingDisconnect(true);
              }}
              testID="disconnect"
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
