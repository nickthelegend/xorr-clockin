/**
 * Development-only remote control for screenshots and smoke tests on a simulator nobody is tapping:
 *
 *   xcrun simctl openurl <udid> 'xorr://today?auto=checkin'
 *
 * Each screen passes its own actions; an `auto=<name>` deep link runs one once. Compiled out of release builds
 * (`__DEV__` is false there), so the APK has no such door.
 */
import { useEffect, useRef } from 'react';
import type { ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export function useAutopilot(actions: Record<string, () => unknown>, ready = true): void {
  const { auto, n } = useLocalSearchParams<{ auto?: string; n?: string }>();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!__DEV__ || !auto) return;
    // eslint-disable-next-line no-console
    console.log(`[clockin] autopilot ${auto} ready=${ready} known=${!!actions[auto]}`);
    if (!ready) return;
    const key = `${auto}:${n ?? ''}`;
    if (done.current === key) return;
    done.current = key;
    void actions[auto]?.();
  }, [auto, n, ready, actions]);
}

/**
 * Development-only: poll a local command queue (`tools/clockin/remote.mjs`, port 4405) and open what it says, e.g.
 * `{"path":"/today","auto":"checkin"}`. `simctl openurl` stops on iOS's "Open in xorr?" prompt, which nobody is there
 * to tap; this does not. Mounted only when `__DEV__`.
 */
export function useRemote(navigate: (href: string) => void): void {
  useEffect(() => {
    if (!__DEV__) return;
    let alive = true;
    const base = process.env.EXPO_PUBLIC_CLOCKIN_REMOTE || 'http://127.0.0.1:4405';
    const tick = async () => {
      try {
        const res = await fetch(`${base}/next`);
        if (res.status === 200) {
          const cmd = (await res.json()) as { id: number; path: string; auto?: string };
          // eslint-disable-next-line no-console
          console.log(`[clockin] remote ${cmd.path} ${cmd.auto ?? ''}`);
          navigate(`${cmd.path}${cmd.auto ? `?auto=${cmd.auto}&n=${cmd.id}` : ''}`);
        }
      } catch {
        // No remote running: nothing to do.
      }
      if (alive) setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      alive = false;
    };
  }, [navigate]);
}

/** Development-only: `auto=y600` / `auto=bottom` / `auto=top` scrolls the screen, for screenshots. */
export function useScrollAutopilot() {
  const ref = useRef<ScrollView>(null);
  const { auto, n } = useLocalSearchParams<{ auto?: string; n?: string }>();
  useEffect(() => {
    if (!__DEV__ || !auto) return;
    const t = setTimeout(() => {
      if (auto === 'bottom') ref.current?.scrollToEnd({ animated: false });
      else if (auto === 'top') ref.current?.scrollTo({ y: 0, animated: false });
      else if (/^y\d+$/.test(auto)) ref.current?.scrollTo({ y: Number(auto.slice(1)), animated: false });
    }, 400);
    return () => clearTimeout(t);
  }, [auto, n]);
  return ref;
}
