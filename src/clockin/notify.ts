/** Web/test: no local notifications. */
export async function scheduleDailyBrief(_streak: number): Promise<boolean> {
  return false;
}
export async function notifyNow(_title: string, _body: string): Promise<void> {}
