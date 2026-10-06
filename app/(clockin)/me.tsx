/**
 * Me — the wallet, the agent's key, the morning brief, the optional AI key, the whole trail, and what this build is.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Switch, Text, colors, radius, space } from '@/ui';
import { successTap, warningTap } from '@/ui/haptics';
import { DEVNET, DEVNET_RPC, STOCKS } from '@/clockin/config';
import { feeMode, getDevnetSol, useLive } from '@/clockin/desk';
import { clearAiKey, getAiKey, setAiKey } from '@/clockin/ai';
import { mwaDisconnect } from '@/clockin/mwa';
import { scheduleDailyBrief } from '@/clockin/notify';
import { useClockin } from '@/clockin/session';
import { currentStreak } from '@/clockin/streak';
import { useDesk } from '@/clockin/useDesk';
import { useAutopilot, useScrollAutopilot } from '@/clockin/autopilot';
import { AddressLink, Banner, Card, DevnetPill, Eyebrow, TxLink } from '@/clockin/ui';
import { WALLET_LABEL } from '@/clockin/useOwner';

export default function Me() {
  const router = useRouter();
  const { owner, live } = useDesk();
  const scroller = useScrollAutopilot();
  const wallet = useClockin((s) => s.wallet);
  const activity = useClockin((s) => s.activity);
  const streak = useClockin((s) => s.streak);
  const aiModel = useClockin((s) => s.aiModel);
  const set = useClockin((s) => s.set);
  const disconnect = useClockin((s) => s.disconnect);
  const [hasKey, setHasKey] = useState(false);
  const [key, setKey] = useState('');
  const [brief, setBrief] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'up' | 'down' | 'warn'; sig?: string } | null>(null);

  useEffect(() => {
    void getAiKey().then((k) => setHasKey(!!k));
  }, []);

  async function onDisconnect() {
    if (wallet?.mwa) await mwaDisconnect(wallet.mwa);
    useLive.setState({ view: null, mainnetSkr: null, sgt: undefined });
    disconnect();
    router.replace('/start');
  }
  useAutopilot({ disconnect: onDisconnect });

  const input = { backgroundColor: colors.inputBg, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.inputBorder, color: colors.ink, padding: 12, fontSize: 15 } as const;

  return (
    <Screen gutter="none">
      <ScrollView ref={scroller} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.s44, gap: space.s16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.s8 }}>
          <Text variant="screenTitle">Me</Text>
          <DevnetPill />
        </View>

        {msg ? (
          <View style={{ gap: 4 }}>
            <Banner text={msg.text} tone={msg.tone} />
            <TxLink sig={msg.sig} />
          </View>
        ) : null}

        <Card>
          <Eyebrow>Wallet</Eyebrow>
          <Text variant="cardTitleLg">{wallet ? wallet.label ?? WALLET_LABEL[wallet.kind] : '—'}</Text>
          {owner ? <AddressLink address={owner.address} label={owner.address} /> : null}
          <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s6 }}>
            {wallet?.kind === 'mwa'
              ? 'Signs over Mobile Wallet Adapter — on a Seeker, Seed Vault. The app never sees its key.'
              : wallet?.kind === 'privy'
                ? "Privy's embedded wallet, unlocked by your email. The app never sees its key."
                : 'A devnet-only key kept in this phone\'s keystore. Fine for trying xorr; use Seed Vault for anything real.'}
          </Text>
          <Text variant="footnote" color={colors.ink45} style={{ marginTop: space.s6 }}>
            {live.view
              ? feeMode(live.view) === 'faucet'
                ? `${live.view.sol.toFixed(4)} devnet SOL — you need none; xorr's faucet pays fees.`
                : `${live.view.sol.toFixed(4)} devnet SOL — xorr's faucet is dry, so you pay devnet fees for now.`
              : ''}
          </Text>
          <Button
            label="Get 0.5 devnet SOL (optional)"
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
                setMsg({ tone: 'warn', text: (e as Error).message });
              }
            }}
            style={{ marginTop: space.s10 }}
          />
        </Card>

        <Card>
          <Eyebrow>Morning brief</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="bodySm" color={colors.ink70} style={{ flex: 1 }}>
              A notification at 8:30 every morning with your streak on the line.
            </Text>
            <Switch
              on={brief}
              onChange={async (v: boolean) => {
                setBrief(v);
                if (v) {
                  const ok = await scheduleDailyBrief(currentStreak(streak), true);
                  if (!ok) {
                    setBrief(false);
                    setMsg({ tone: 'warn', text: 'Notifications are off for xorr in Settings.' });
                  } else successTap();
                }
              }}
              accessibilityLabel="Morning brief notification"
            />
          </View>
        </Card>

        <Card>
          <Eyebrow>AI narration · optional</Eyebrow>
          <Text variant="bodySm" color={colors.ink70}>
            The agent decides on its own rules. Add your own OpenRouter key and a model also writes the morning brief and answers
            your questions. The key stays in this phone’s keystore.
          </Text>
          {hasKey ? (
            <Button
              label="Remove my key"
              variant="ghost"
              onPress={async () => {
                await clearAiKey();
                setHasKey(false);
              }}
              style={{ marginTop: space.s10 }}
            />
          ) : (
            <>
              <TextInput style={[input, { marginTop: space.s10 }]} placeholder="sk-or-…" placeholderTextColor={colors.ink38} autoCapitalize="none" secureTextEntry value={key} onChangeText={setKey} />
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
                style={{ marginTop: space.s10 }}
              />
            </>
          )}
          <TextInput style={[input, { marginTop: space.s10 }]} value={aiModel} onChangeText={(m) => set({ aiModel: m })} autoCapitalize="none" accessibilityLabel="Model" />
        </Card>

        <Card>
          <Eyebrow>Everything on devnet</Eyebrow>
          {activity.slice(0, 30).map((a) => (
            <View key={a.id} style={{ paddingVertical: space.s8, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
              <Text variant="rowPrimary" color={a.ok ? colors.ink : colors.down}>
                {a.title}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="footnoteSm" color={colors.ink32}>
                  {new Date(a.at).toLocaleString()}
                </Text>
                <TxLink sig={a.sig} label="Explorer" />
              </View>
            </View>
          ))}
          {!activity.length ? (
            <Text variant="bodySm" color={colors.ink45}>
              Nothing yet.
            </Text>
          ) : null}
        </Card>

        <Card>
          <Eyebrow>About this build</Eyebrow>
          <Text variant="bodySm" color={colors.ink70}>
            xorr · CLOCK IN runs on Solana devnet ({DEVNET_RPC.replace('https://', '')}). dUSDC, dSKR and the five xStock
            stand-ins are devnet test tokens{' '}
            {DEVNET.source === 'shared'
              ? "minted by xorr's devnet faucet"
              : "this phone created for itself, because xorr's shared devnet set was not available — this phone is their mint authority"}
            ; they fill at Jupiter’s live prices for the real xStocks. Nothing here is real money. The full xorr — real
            xStocks on mainnet through Jupiter — is a separate, hosted app.
          </Text>
          <View style={{ marginTop: space.s10, gap: 2 }}>
            <AddressLink address={DEVNET.usdcMint} label="dUSDC mint" />
            <AddressLink address={DEVNET.skrMint} label="dSKR mint (SKR stand-in)" />
            {STOCKS.map((s) => (
              <AddressLink key={s.symbol} address={s.devnetMint} label={`${s.symbol} stand-in mint`} />
            ))}
            <AddressLink address={DEVNET.faucet} label={DEVNET.source === 'shared' ? 'xorr devnet faucet / venue' : 'this phone’s venue key'} />
          </View>
        </Card>

        <Button
          label="Disconnect"
          variant="destructive"
          onPress={onDisconnect}
          testID="disconnect"
        />
      </ScrollView>
    </Screen>
  );
}
