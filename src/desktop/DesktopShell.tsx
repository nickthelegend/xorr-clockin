/**
 * The desktop web app's frame (2026-10-01): a sidebar, a top bar, and a content area.
 *
 * Pages that have a desktop layout (`DESKTOP_PAGES`) get the whole content area and draw their own multi-column
 * layout. Every other screen — a phone screen with no desktop version yet, a sheet, a settings page — renders in a
 * centred panel the width of a phone, so nothing that works on a phone breaks on a laptop. Onboarding and a signed-out
 * visitor get no sidebar: a centred panel over the backdrop, like a sign-in page.
 *
 * `PhoneFrame` still wraps everything below the desktop width.
 */
import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Icon, type IconName } from '@/design/Icon';
import { Text, alpha, colors, radius, space } from '@/ui';
import { useStore } from '@/state/store';
import { useChatDrawer } from '@/chat/chatDrawer';
import { CONTENT_MAX_WIDTH, PANEL_WIDTH, SIDEBAR_WIDTH, TOPBAR_HEIGHT } from './useDesktop';

type NavItem = { label: string; href: string; icon: IconName; match: (p: string) => boolean };

/** The sidebar, top to bottom. `match` decides which item is lit for the current path. */
export const NAV: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home', match: (p) => p === '/' },
  { label: 'Markets', href: '/xstocks', icon: 'markets', match: (p) => p === '/xstocks' || p.startsWith('/asset') || p.startsWith('/xstock') || p === '/stocks' },
  { label: 'Pre-IPO', href: '/pre-ipo', icon: 'star', match: (p) => p === '/pre-ipo' },
  { label: 'Agents', href: '/bot/roster', icon: 'bot', match: (p) => p.startsWith('/bot') || p.startsWith('/agent') },
  { label: 'Portfolio', href: '/portfolio', icon: 'assets', match: (p) => p === '/portfolio' || p.startsWith('/position') },
  { label: 'Activity', href: '/activity', icon: 'activity', match: (p) => p === '/activity' || p.startsWith('/runs') || p.startsWith('/explain') },
];

export const NAV_BOTTOM: NavItem[] = [
  { label: 'Safety', href: '/safety', icon: 'shield', match: (p) => p === '/safety' || p === '/delegation' },
  { label: 'Settings', href: '/settings', icon: 'gear', match: (p) => p === '/settings' || p === '/profile' || p === '/recovery' },
];

/**
 * Paths whose screen draws a desktop layout of its own, so the shell gives it the full content width. A page joins
 * this list in the same change that gives it a desktop layout.
 */
export const DESKTOP_PAGES: ((p: string) => boolean)[] = [
  (p) => p === '/',
  (p) => p === '/xstocks',
  (p) => /^\/asset\/[^/]+$/.test(p),
  (p) => p === '/bot/roster',
  (p) => /^\/agent\/[^/]+$/.test(p) && !/^\/agent\/(new|policy|risk|basket|strategies|wallet)$/.test(p),
  (p) => p === '/portfolio',
  (p) => p === '/activity',
  (p) => p === '/pre-ipo',
];

/** Routes that are the way in — no sidebar, no top bar. */
function isOnboarding(p: string): boolean {
  return ['/welcome', '/wallet', '/goals', '/fund', '/delegate', '/proposal'].includes(p);
}

function short(address?: string): string {
  return address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '';
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.navigate(item.href as never)}
      style={({ hovered }: { hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: 42,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: active ? colors.control : hovered ? alpha('#FFFFFF', 0.04) : 'transparent',
      })}
    >
      <Icon name={item.icon} size={19} color={active ? colors.ink : colors.ink55} />
      <Text variant="rowPrimary" color={active ? colors.ink : colors.ink65}>
        {item.label}
      </Text>
    </Pressable>
  );
}

function Sidebar({ path }: { path: string }) {
  const router = useRouter();
  return (
    <View
      style={{
        width: SIDEBAR_WIDTH,
        borderRightWidth: 1,
        borderRightColor: colors.hairline,
        backgroundColor: '#050506',
        paddingHorizontal: 14,
        paddingTop: 22,
        paddingBottom: 18,
      }}
    >
      <Pressable onPress={() => router.navigate('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 28 }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 30, height: 30, borderRadius: 8 }} />
        <Text variant="screenTitle">xorr</Text>
      </Pressable>
      <View style={{ gap: 4 }}>
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(path)} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 4 }}>
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} item={item} active={item.match(path)} />
        ))}
      </View>
      <View
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: radius.card,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.hairline,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.up }} />
          <Text variant="secondary" color={colors.ink70}>
            Live on Solana mainnet
          </Text>
        </View>
        <Text variant="secondarySm" color={colors.ink40}>
          Tokenized stocks · Jupiter · Pyth
        </Text>
      </View>
    </View>
  );
}

function TopBar() {
  const router = useRouter();
  const wallet = useStore((s) => s.wallet);
  const showChat = useChatDrawer((s) => s.show);
  return (
    <View
      style={{
        height: TOPBAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 28,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
        backgroundColor: colors.bg,
      }}
    >
      <Pressable
        onPress={() => router.push('/search')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          width: 380,
          height: 40,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.hairline,
        }}
      >
        <Icon name="search" size={17} color={colors.ink45} />
        <Text variant="body" color={colors.ink45}>
          Search stocks and pre-IPO companies
        </Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      <TopButton icon="chat" label="Ask your agents" onPress={() => showChat()} />
      <TopButton icon="plus" label="Deposit" onPress={() => router.push('/deposit')} primary />
      <IconOnly icon="bell" onPress={() => router.push('/notifications')} />
      <Pressable
        onPress={() => router.push('/profile')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          height: 40,
          paddingLeft: 6,
          paddingRight: 14,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.hairline,
        }}
      >
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="assets" size={15} color={colors.bg} />
        </View>
        <Text variant="control" color={colors.ink70}>
          {wallet ? short(wallet.address) : 'Sign in'}
        </Text>
      </Pressable>
    </View>
  );
}

function TopButton({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: primary ? colors.ink : colors.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.hairline,
      }}
    >
      <Icon name={icon} size={16} color={primary ? colors.bg : colors.ink70} />
      <Text variant="control" color={primary ? colors.bg : colors.ink70}>
        {label}
      </Text>
    </Pressable>
  );
}

function IconOnly({ icon, onPress }: { icon: IconName; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
      }}
    >
      <Icon name={icon} size={17} color={colors.ink70} />
    </Pressable>
  );
}

/** A phone screen with no desktop version, centred in a panel so it keeps its own proportions. */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 24 }}>
      <View
        style={{
          flex: 1,
          width: PANEL_WIDTH,
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.hairline,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/';
  const wallet = useStore((s) => s.wallet);

  if (isOnboarding(path) || !wallet) {
    // The way in, as a split screen: what xorr is on the left, the phone's own sign-in steps on the right.
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
        <Backdrop />
        <Pitch />
        <View style={{ width: PANEL_WIDTH + 96, paddingHorizontal: 48 }}>
          <Panel>{children}</Panel>
        </View>
      </View>
    );
  }

  const wide = DESKTOP_PAGES.some((m) => m(path));
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <Sidebar path={path} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar />
        <View style={{ flex: 1, minHeight: 0 }}>
          {wide ? (
            <View style={{ flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}>{children}</View>
          ) : (
            <Panel>{children}</Panel>
          )}
        </View>
      </View>
    </View>
  );
}

const PITCH_POINTS: { title: string; body: string }[] = [
  { title: 'Agents that trade while you are off', body: 'Hire an AI agent, give it a small wallet and clear rules, and it buys and sells tokenized US stocks for you.' },
  { title: 'Your keys, your money', body: 'A Privy wallet only you control. The bot gets one permission — a daily cap and an end date the chain enforces.' },
  { title: 'One tap takes it back', body: 'Stop all trading revokes every permission on-chain, agent wallets included — even if our server is down.' },
];

/** The left half of the way in: what xorr is, in three lines. */
function Pitch() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 72, gap: 36 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 40, height: 40, borderRadius: 10 }} />
        <Text variant="titleLg">xorr</Text>
      </View>
      <View style={{ gap: 14, maxWidth: 620 }}>
        <Text variant="heroAmount" style={{ fontSize: 54, lineHeight: 58 }}>
          Stocks never sleep. Now your trading doesn&apos;t either.
        </Text>
        <Text variant="bodyLg" color={colors.ink55}>
          AI agents that trade tokenized US stocks and pre-IPO companies on Solana — from their own wallets, inside the
          rules you set.
        </Text>
      </View>
      <View style={{ gap: 18, maxWidth: 560 }}>
        {PITCH_POINTS.map((p) => (
          <View key={p.title} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: '#C6F432' }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="rowPrimaryLg">{p.title}</Text>
              <Text variant="body" color={colors.ink55}>
                {p.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.up }} />
        <Text variant="secondary" color={colors.ink55}>
          Live on Solana mainnet · Jupiter · Pyth · Tessera
        </Text>
      </View>
    </View>
  );
}

/** A soft glow behind the sign-in panel, so a centred column on a wide screen reads as designed. */
function Backdrop() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 } as never}>
      <View
        style={{
          position: 'absolute',
          left: '50%',
          top: '10%',
          width: 900,
          height: 900,
          marginLeft: -450,
          borderRadius: 450,
          backgroundColor: alpha('#5B47FF', 0.12),
          filter: 'blur(120px)',
        } as never}
      />
    </View>
  );
}

/** A page body that scrolls inside the content area, with the desktop gutters. */
export function DesktopPage({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 28, paddingBottom: 48, gap: space.s20 }}>
      {children}
    </ScrollView>
  );
}
