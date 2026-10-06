/** Web/test: no local notifications. */
export async function scheduleDailyBrief(_streak: number, _ask = false): Promise<boolean> {
  return false;
}
export async function notifyNow(_title: string, _body: string): Promise<void> {}
