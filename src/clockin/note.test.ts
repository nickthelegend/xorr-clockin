import { describe, expect, it } from 'vitest';
import { splitNote } from './note';

describe('an error note reads as a label and a detail', () => {
  it('splits at the first sentence', () => {
    expect(splitNote('Can’t reach Solana devnet right now. Your tokens are safe on chain — try again in a moment.')).toEqual({
      label: 'Can’t reach Solana devnet right now',
      detail: 'Your tokens are safe on chain — try again in a moment.',
    });
  });
  it('keeps a one-sentence error whole', () => {
    expect(splitNote('The wallet declined.')).toEqual({ label: 'The wallet declined', detail: '' });
  });
});
