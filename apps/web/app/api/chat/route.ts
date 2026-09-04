import { NextResponse } from 'next/server';
import { localPlantBrief } from '@/lib/chat-local';
import { llmConfig, type LlmMessage } from '@/lib/llm';
import type { ChatSnapshot } from '@/lib/chat-context';

export const runtime = 'nodejs';

function systemPrompt(snapshot: ChatSnapshot): string {
  return [
    'You are AQUASENSE, an operations assistant for a wastewater digital twin.',
    'Answer about plants and sensors using the live snapshot. Be concise and operational.',
    'Use plant, not building. If data is missing, say so.',
    '',
    'Live snapshot JSON:',
    JSON.stringify(snapshot),
  ].join('\n');
}

export async function GET() {
  const cfg = llmConfig();
  return NextResponse.json({
    configured: cfg.configured,
    model: cfg.configured ? cfg.model : null,
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages?: LlmMessage[];
    snapshot?: ChatSnapshot;
  };
  const messages = (body.messages ?? []).filter((m) => m.role === 'user' || m.role === 'assistant');
  const snapshot = body.snapshot;
  if (!snapshot || messages.length === 0) {
    return NextResponse.json({ message: 'messages and snapshot are required' }, { status: 400 });
  }

  const cfg = llmConfig();
  if (!cfg.configured) {
    return NextResponse.json({
      content: localPlantBrief(messages, snapshot),
      source: 'local',
    });
  }

  const payload = {
    model: cfg.model,
    stream: true,
    messages: [{ role: 'system', content: systemPrompt(snapshot) }, ...messages],
  };

  try {
    const upstream = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json({
        content: `${localPlantBrief(messages, snapshot)}\n\n_LLM request failed (${upstream.status}): ${text.slice(0, 180)}_`,
        source: 'local',
      });
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream') && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const json = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return NextResponse.json({
      content: json.choices?.[0]?.message?.content ?? 'The model returned an empty reply.',
      source: 'llm',
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unreachable';
    return NextResponse.json({
      content: `${localPlantBrief(messages, snapshot)}\n\n_LLM endpoint unreachable (${reason})._`,
      source: 'local',
    });
  }
}
