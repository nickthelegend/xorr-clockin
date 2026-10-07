/**
 * The few helpers the CLOCK IN screens share. Everything visual comes from xorr's own kit (`@/ui`); this file holds only
 * a token mark with the issuers' logos, the explorer opener, and number formatting.
 */
import React from 'react';
import { Linking } from 'react-native';
import { AssetMark, colors, size } from '@/ui';
import { selectionTick } from '@/ui/haptics';
import { LOGOS } from './config';

export function openUrl(url: string) {
  selectionTick();
  void Linking.openURL(url);
}

/** A token's mark: its logo where the issuer publishes one, over its gradient (the app's AssetMark). */
/**
 * A token's mark. SKR draws its logo; every devnet stand-in (the xStock stand-ins, dUSDC) draws a neutral ticker mark —
 * its colours and its ticker's first letter, the same monogram xorr gives instruments with no logo — so nothing on screen
 * suggests the company or the stablecoin's issuer made the token.
 */
export function TokenMark({ symbol, c1, c2, size: px = size.mark }: { symbol: string; c1: string; c2: string; size?: number }) {
  const uri = LOGOS[symbol] ?? null;
  const letter = symbol.replace(/^d(?=[A-Z])/, '').charAt(0);
  return <AssetMark gradient={uri ? { c1, c2 } : { c1, c2, monogram: { letters: letter, ink: colors.ink } }} uri={uri} size={px} />;
}

export const usd = (n: number, digits = 2) =>
  `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
export const signedUsd = (n: number) => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;
export const signedPct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`;
export const whole = (n: number) => Math.floor(n).toLocaleString('en-US');
