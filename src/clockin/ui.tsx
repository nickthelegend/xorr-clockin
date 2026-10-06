/**
 * Small pieces the CLOCK IN screens share, built only from the app's design system (`@/ui`).
 */
import React from 'react';
import { Linking, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon, type IconName } from '@/design/Icon';
import { Press, Text, colors, radius, space } from '@/ui';
import { selectionTick } from '@/ui/haptics';
import { explorerAddress, explorerTx } from './config';
import { weekStrip, type StreakState } from './streak';

export const SKR_GOLD = colors.goldFill;

/** The label that sits on every CLOCK IN screen: this is devnet, and nothing here is real money. */
export function DevnetPill({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityLabel="Solana devnet. Test tokens only."
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: colors.warnBg },
        style,
      ]}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warn }} />
      <Text variant="chip" color={colors.warn}>
        DEVNET · TEST TOKENS
      </Text>
    </View>
  );
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View
      testID={testID}
      style={[{ backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.cardBorder, padding: space.s18 }, style]}
    >
      {children}
    </View>
  );
}

export function Eyebrow({ children, color = colors.ink45 }: { children: React.ReactNode; color?: string }) {
  return (
    <Text variant="eyebrow" color={color} style={{ marginBottom: space.s10 }}>
      {children}
    </Text>
  );
}

export function openUrl(url: string) {
  selectionTick();
  void Linking.openURL(url);
}

/** A devnet signature, as a link to the explorer. */
export function TxLink({ sig, label = 'View on Solana Explorer', color = colors.ink55 }: { sig?: string; label?: string; color?: string }) {
  if (!sig) return null;
  return (
    <Press onPress={() => openUrl(explorerTx(sig))} accessibilityRole="link" accessibilityLabel={label} hitHeight={36}>
      <Text variant="footnote" color={color} style={{ textDecorationLine: 'underline' }}>
        {label} · {sig.slice(0, 6)}…{sig.slice(-4)}
      </Text>
    </Press>
  );
}

export function AddressLink({ address, label }: { address: string; label?: string }) {
  return (
    <Press onPress={() => openUrl(explorerAddress(address))} accessibilityRole="link" hitHeight={36}>
      <Text variant="footnote" color={colors.ink55} style={{ textDecorationLine: 'underline' }}>
        {label ?? `${address.slice(0, 4)}…${address.slice(-4)}`}
      </Text>
    </Press>
  );
}

export function Banner({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'down' | 'up' }) {
  const fg = tone === 'warn' ? colors.warn : tone === 'down' ? colors.down : colors.up;
  const bg = tone === 'warn' ? colors.warnBg : tone === 'down' ? colors.downBg : colors.upBg;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.tile, padding: space.s12 }}>
      <Text variant="bodySm" color={fg}>
        {text}
      </Text>
    </View>
  );
}

/** A stock's mark: its gradient disc with the ticker's first letter. */
export function StockMark({ symbol, c1, c2, size = 34 }: { symbol: string; c1: string; c2: string; size?: number }) {
  const id = `g-${symbol}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="32%" cy="26%" r="74%">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} rx={size / 2} fill={`url(#${id})`} />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="value" color={colors.bg}>
          {symbol.charAt(0)}
        </Text>
      </View>
    </View>
  );
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The week strip: seven days, the done ones lit. */
export function WeekStrip({ streak }: { streak: StreakState }) {
  const days = weekStrip(streak);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityLabel={`${days.filter((d) => d.done).length} of the last 7 days clocked in`}>
      {days.map((d) => (
        <View key={d.day} style={{ alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: d.done ? SKR_GOLD : colors.control,
              borderWidth: d.today ? 1.5 : 0,
              borderColor: d.done ? colors.goldInk : colors.ink55,
            }}
          >
            {d.done ? <Icon name="check" size={15} color={colors.goldInk} strokeWidth={2.6} /> : null}
          </View>
          <Text variant="footnoteSm" color={d.today ? colors.ink : colors.ink38}>
            {DOW[new Date(`${d.day}T12:00:00Z`).getUTCDay()]}
          </Text>
        </View>
      ))}
    </View>
  );
}

export type ClockinTab = 'today' | 'desk' | 'skr' | 'me';

const TABS: { key: ClockinTab; label: string; icon: IconName }[] = [
  { key: 'today', label: 'Today', icon: 'sun' },
  { key: 'desk', label: 'Agent', icon: 'bot' },
  { key: 'skr', label: 'SKR', icon: 'sparkle' },
  { key: 'me', label: 'Me', icon: 'gear' },
];

export function ClockinTabBar({ active, onSelect }: { active: ClockinTab; onSelect: (t: ClockinTab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: space.s16, paddingTop: space.s6, paddingBottom: Math.max(insets.bottom, space.s12), backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          height: 60,
          borderRadius: 30,
          paddingHorizontal: space.s6,
          alignItems: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.ghostBorder,
        }}
      >
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Press
              key={t.key}
              testID={`tab-${t.key}`}
              onPress={() => {
                selectionTick();
                onSelect(t.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t.label}
              style={{ flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? colors.control : 'transparent' }}
            >
              <Icon name={t.icon} size={22} color={on ? colors.ink : colors.ink55} />
              <Text variant="tabLabel" color={on ? colors.ink : colors.ink55}>
                {t.label}
              </Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

export const usd = (n: number, digits = 2) =>
  `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
export const signedUsd = (n: number) => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;
export const signedPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;
export const whole = (n: number) => Math.floor(n).toLocaleString('en-US');
