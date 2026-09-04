'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/stores/useAuth';

export function AuthGate({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuth((s) => s.hydrated);
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (admin && user?.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [admin, hydrated, pathname, router, token, user?.role]);

  if (!hydrated || !token || (admin && user?.role !== 'ADMIN')) {
    return (
      <div className="flex h-dvh items-center justify-center bg-shell-950">
        <div className="slab px-6 py-4 shadow-brut">
          <span className="label-xs">Authorising console</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
