'use client';

import { create } from 'zustand';
import { buildChatSnapshot } from '@/lib/chat-context';
import { extractDelta, type LlmMessage } from '@/lib/llm';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
  source?: 'llm' | 'local';
}

interface ChatState {
  messages: ChatMessage[];
  panelOpen: boolean;
  busy: boolean;
  error: string | null;
  llmConfigured: boolean | null;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  reset: () => void;
  probe: () => Promise<void>;
  send: (text: string) => Promise<void>;
}

function nid(): string {
  return `msg-${Math.random().toString(36).slice(2, 10)}`;
}

export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  panelOpen: false,
  busy: false,
  error: null,
  llmConfigured: null,

  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  reset: () => set({ messages: [], error: null, busy: false }),

  probe: async () => {
    try {
      const res = await fetch('/api/chat');
      const data = (await res.json()) as { configured?: boolean };
      set({ llmConfigured: Boolean(data.configured) });
    } catch {
      set({ llmConfigured: false });
    }
  },

  send: async (text) => {
    const content = text.trim();
    if (!content || get().busy) return;

    const user: ChatMessage = { id: nid(), role: 'user', content };
    const assistant: ChatMessage = { id: nid(), role: 'assistant', content: '', pending: true };
    set((s) => ({
      messages: [...s.messages, user, assistant],
      busy: true,
      error: null,
    }));

    const history: LlmMessage[] = [...get().messages]
      .filter((m) => !m.pending || m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          snapshot: buildChatSnapshot(),
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || res.statusText);
      }

      const ctype = res.headers.get('content-type') ?? '';
      if (ctype.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += extractDelta(decoder.decode(value, { stream: true }));
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistant.id ? { ...m, content: acc, source: 'llm' } : m,
            ),
          }));
        }
        set((s) => ({
          busy: false,
          messages: s.messages.map((m) =>
            m.id === assistant.id
              ? { ...m, pending: false, content: acc || 'The model returned an empty reply.', source: 'llm' }
              : m,
          ),
        }));
        return;
      }

      const json = (await res.json()) as { content?: string; source?: 'llm' | 'local' };
      set((s) => ({
        busy: false,
        llmConfigured: json.source === 'llm' ? true : s.llmConfigured,
        messages: s.messages.map((m) =>
          m.id === assistant.id
            ? {
                ...m,
                pending: false,
                content: json.content ?? 'No reply.',
                source: json.source,
              }
            : m,
        ),
      }));
    } catch (error) {
      set((s) => ({
        busy: false,
        error: error instanceof Error ? error.message : 'Chat failed',
        messages: s.messages.map((m) =>
          m.id === assistant.id
            ? { ...m, pending: false, content: 'The assistant could not answer that just now.' }
            : m,
        ),
      }));
    }
  },
}));
