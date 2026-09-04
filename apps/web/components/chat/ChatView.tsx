'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { getFacility } from '@aquasense/shared';
import { chatPrompts } from '@/lib/chat-prompts';
import { buildChatSnapshot } from '@/lib/chat-context';
import { useAuth } from '@/stores/useAuth';
import { useChat } from '@/stores/useChat';
import { useConsole } from '@/stores/useConsole';
import { HardButton } from '@/components/ui/primitives';

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <p key={i} className={clsx(i > 0 && 'mt-1.5', !line && 'h-2')}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-semibold text-slate-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={j} className="border border-line bg-shell-850 px-1 text-[12px] text-flow tnum">
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </p>
    );
  });
}

export function ChatView({ compact }: { compact?: boolean }) {
  const messages = useChat((s) => s.messages);
  const busy = useChat((s) => s.busy);
  const error = useChat((s) => s.error);
  const configured = useChat((s) => s.llmConfigured);
  const send = useChat((s) => s.send);
  const reset = useChat((s) => s.reset);
  const probe = useChat((s) => s.probe);
  const plants = useAuth((s) => s.plants);
  const facilityId = useConsole((s) => s.facilityId);
  useConsole((s) => s.tick);

  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const plant = getFacility(facilityId, plants);
  const prompts = chatPrompts(buildChatSnapshot());
  const empty = messages.length === 0;

  useEffect(() => {
    void probe();
  }, [probe]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft;
    setDraft('');
    void send(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-shell-950">
      <div
        ref={scroller}
        className={clsx('min-h-0 flex-1 overflow-y-auto', compact ? 'px-3 py-3' : 'px-4 py-8')}
      >
        <div className={clsx('mx-auto', compact ? 'max-w-none' : 'max-w-[720px]')}>
          {empty ? (
            <div className={clsx(compact ? 'pt-2' : 'pt-10')}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flow">
                Aquasense assistant
              </div>
              <h2
                className={clsx(
                  'mt-2 font-bold tracking-tight text-white',
                  compact ? 'text-[22px]' : 'text-[34px]',
                )}
              >
                What can I help with?
              </h2>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-slate-400">
                Ask about {plant.shortName} sensors, alarms, effluent, or what to check next.
                {configured === false && ' The model endpoint is not connected yet — replies use the live plant brief.'}
              </p>
              <div className={clsx('mt-5 grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
                {prompts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void send(item.prompt)}
                    className="focus-hard border-2 border-line bg-shell-900 px-3 py-3 text-left transition-colors hover:border-flow/50 hover:bg-shell-850"
                  >
                    <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-100">
                      {item.title}
                    </div>
                    <div className="label-xs mt-1.5 normal-case tracking-normal">{item.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                >
                  <div
                    className={clsx(
                      'mt-0.5 flex size-7 shrink-0 items-center justify-center border-2 text-[9px] font-bold tracking-[0.12em]',
                      message.role === 'user'
                        ? 'border-line text-slate-300'
                        : 'border-flow/50 bg-flow/10 text-flow',
                    )}
                  >
                    {message.role === 'user' ? 'YOU' : 'AI'}
                  </div>
                  <div
                    className={clsx(
                      'min-w-0 max-w-[85%] border-2 px-3 py-2.5 text-[13px] leading-relaxed',
                      message.role === 'user'
                        ? 'border-line bg-shell-850 text-slate-100'
                        : 'border-line/70 bg-shell-900 text-slate-200',
                    )}
                  >
                    {message.pending && !message.content ? (
                      <span className="label-xs">Reading plant…</span>
                    ) : (
                      renderText(message.content)
                    )}
                    {message.source === 'local' && (
                      <div className="label-xs mt-2 text-faint">Local plant brief</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-3 text-[12px] text-critical">{error}</p>}
        </div>
      </div>

      <form
        onSubmit={submit}
        className={clsx('shrink-0 border-t-2 border-line bg-shell-900', compact ? 'p-2.5' : 'px-4 py-3')}
      >
        <div className={clsx('mx-auto', compact ? 'max-w-none' : 'max-w-[720px]')}>
          {!empty && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {prompts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(item.prompt)}
                  className="border border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:border-flow hover:text-flow disabled:opacity-50"
                >
                  {item.title}
                </button>
              ))}
              <HardButton onClick={() => reset()} className="ml-auto">
                New chat
              </HardButton>
            </div>
          )}
          <div className="flex items-end gap-2 border-2 border-line bg-shell-850 px-2 py-2 focus-within:border-flow">
            <textarea
              ref={input}
              value={draft}
              rows={compact ? 2 : 1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Ask about ${plant.shortName}…`}
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[13px] text-slate-100 outline-none placeholder:text-faint"
            />
            <HardButton type="submit" tone="flow" disabled={busy || !draft.trim()}>
              {busy ? '…' : 'Send'}
            </HardButton>
          </div>
          <p className="label-xs mt-1.5 normal-case tracking-normal">
            {plant.shortName} · {plant.code}
            {configured ? ' · model connected' : ' · local brief until LLM_BASE_URL is set'}
          </p>
        </div>
      </form>
    </div>
  );
}
