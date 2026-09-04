export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

/** OpenAI-compatible chat completion (non-stream). */
export interface ChatCompletion {
  id?: string;
  choices?: Array<{
    message?: { role?: string; content?: string };
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
}

export function llmConfig() {
  const baseUrl = (process.env.LLM_BASE_URL ?? '').replace(/\/$/, '');
  return {
    configured: Boolean(baseUrl),
    baseUrl,
    apiKey: process.env.LLM_API_KEY ?? '',
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  };
}

export function extractDelta(chunk: string): string {
  let text = '';
  for (const line of chunk.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const json = JSON.parse(payload) as ChatCompletion;
      text += json.choices?.[0]?.delta?.content ?? '';
    } catch {
      // ignore malformed SSE lines
    }
  }
  return text;
}
