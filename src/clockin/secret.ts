/**
 * Web / test fallback for `secret.native.ts`. The CLOCK IN build targets Android and iOS; on the web a devnet guest key
 * in localStorage is acceptable because it only ever holds devnet stand-ins.
 */
const mem = new Map<string, string>();
const ls = (): Storage | undefined => (typeof localStorage !== 'undefined' ? localStorage : undefined);

export async function getSecret(key: string): Promise<string | null> {
  return ls()?.getItem(key) ?? mem.get(key) ?? null;
}
export async function setSecret(key: string, value: string): Promise<void> {
  if (ls()) ls()!.setItem(key, value);
  else mem.set(key, value);
}
export async function deleteSecret(key: string): Promise<void> {
  ls()?.removeItem(key);
  mem.delete(key);
}
