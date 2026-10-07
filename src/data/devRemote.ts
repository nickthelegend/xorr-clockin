/** Development only: the next command from the local screenshot remote (`tools/clockin/remote.mjs`), or null. */
export async function nextRemoteCommand(base: string): Promise<{ id: number; path: string; auto?: string } | null> {
  const res = await fetch(`${base}/next`);
  return res.status === 200 ? ((await res.json()) as { id: number; path: string; auto?: string }) : null;
}
