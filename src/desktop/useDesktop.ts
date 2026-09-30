/**
 * Whether this render is the desktop web app (2026-10-01).
 *
 * The web build used to be the phone app in a 402pt column. On a laptop that read as a mobile build nobody had looked
 * at on a big screen. From `DESKTOP_MIN_WIDTH` up, the web draws its own layout — a sidebar, a top bar and wide,
 * multi-column pages — and below it, including a phone's browser and a narrowed window, it falls back to the phone
 * layout exactly as before. Native never takes the desktop path.
 *
 * Read per render from the window, so resizing a browser moves between the two live.
 */
import { Platform, useWindowDimensions } from 'react-native';

/** A laptop's narrowest useful window; below it the sidebar and two columns stop fitting. */
export const DESKTOP_MIN_WIDTH = 1080;

/** Width of the sidebar the desktop shell draws on the left. */
export const SIDEBAR_WIDTH = 248;

/** Height of the top bar. */
export const TOPBAR_HEIGHT = 68;

/** The widest a page's content grows to before it centres, so rows never stretch across a 4K screen. */
export const CONTENT_MAX_WIDTH = 1320;

/** The width a phone screen is given when it renders inside the desktop shell (a sheet-like panel). */
export const PANEL_WIDTH = 520;

export function isDesktopWidth(width: number): boolean {
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}

export function useDesktop(): boolean {
  const { width } = useWindowDimensions();
  return isDesktopWidth(width);
}
