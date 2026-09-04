'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuth } from '@/stores/useAuth';
import { useChat } from '@/stores/useChat';
import { ChatView } from '@/components/chat/ChatView';
import { HardButton } from '@/components/ui/primitives';

export function ChatFab() {
  const pathname = usePathname();
  const token = useAuth((s) => s.token);
  const hydrated = useAuth((s) => s.hydrated);
  const hydrate = useAuth((s) => s.hydrate);
  const open = useChat((s) => s.panelOpen);
  const toggle = useChat((s) => s.togglePanel);
  const setPanelOpen = useChat((s) => s.setPanelOpen);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated || !token) return null;
  if (pathname === '/login' || pathname.startsWith('/chat')) return null;

  const admin = pathname.startsWith('/admin');

  return (
    <div className={clsx('pointer-events-none fixed right-4 z-[70]', admin ? 'bottom-5' : 'bottom-24')}>
      {open && (
        <div className="pointer-events-auto mb-3 flex h-[min(620px,calc(100dvh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col border-2 border-line bg-shell-950 shadow-brut">
          <div className="chrome flex items-center gap-2 border-b-2 border-line bg-shell-900 px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white">Assistant</span>
            <Link
              href="/chat"
              onClick={() => setPanelOpen(false)}
              className="label-xs ml-auto text-flow"
            >
              Full page
            </Link>
            <HardButton onClick={() => setPanelOpen(false)}>Close</HardButton>
          </div>
          <div className="min-h-0 flex-1">
            <ChatView compact />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="pointer-events-auto flex size-14 items-center justify-center border-2 border-flow bg-shell-900 text-flow shadow-brut transition-colors hover:bg-flow/10"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <>
              <path d="M4 6h16v10H7l-3 3V6Z" />
              <path d="M8 10h8M8 13h5" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
