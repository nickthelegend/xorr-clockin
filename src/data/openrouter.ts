/**
 * One chat completion from OpenRouter, with the owner's own key (CLOCK IN build, optional). The data layer's only
 * model call: the key comes from the device keystore and goes nowhere but OpenRouter.
 */
export async function openRouterChat(key: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'xorr CLOCK IN' },
    body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`The model answered ${res.status}.`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('The model returned nothing.');
  return text;
}
