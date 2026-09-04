'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SEVERITY_COLOR, getFacility } from '@aquasense/shared';
import { useAuth } from '@/stores/useAuth';
import { processGroupHealth } from '@/lib/health';
import { useConsole } from '@/stores/useConsole';

const NAV = [
  { href: '/', label: 'Overview', hint: 'Plant twin', icon: 'twin' },
  { href: '/sensors', label: 'Sensors', hint: 'Instrument grid', icon: 'sensors' },
  { href: '/treatment', label: 'Treatment', hint: 'Stage parameters', icon: 'stages' },
  { href: '/compliance', label: 'Compliance', hint: 'Consent limits', icon: 'shield' },
  { href: '/downstream', label: 'Downstream', hint: 'Bloom risk', icon: 'wave' },
  { href: '/alerts', label: 'Alerts', hint: 'Event log', icon: 'bell' },
  { href: '/reports', label: 'Reports', hint: 'Shift handover', icon: 'doc' },
  { href: '/chat', label: 'Assistant', hint: 'Ask the plant', icon: 'chat' },
] as const;

function Icon({ name }: { name: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'twin':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M3 17h18M6 17V9l6-4 6 4v8" />
          <path d="M10 17v-4h4v4" />
        </svg>
      );
    case 'sensors':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
      );
    case 'stages':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <rect x="3" y="5" width="7" height="6" />
          <rect x="14" y="5" width="7" height="6" />
          <rect x="3" y="14" width="7" height="5" />
          <rect x="14" y="14" width="7" height="5" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'wave':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M3 8c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-1.4 4-1.4" />
          <path d="M3 14c2.5-2 4.5-2 7 0s4.5 2 7 0 2.5-1.4 4-1.4" />
          <path d="M3 20c2.5-2 4.5-2 7 0s4.5 2 7 0" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'chat':
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M4 6h16v10H7l-3 3V6Z" />
          <path d="M8 10h8M8 13h5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="size-4" {...common}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4M9 12h6M9 16h6" />
        </svg>
      );
  }
}

export function ProcessSpine() {
  const pathname = usePathname();
  const expanded = useConsole((s) => s.spineExpanded);
  const toggle = useConsole((s) => s.toggleSpine);
  const facilityId = useConsole((s) => s.facilityId);
  const plants = useAuth((s) => s.plants);
  const site = getFacility(facilityId, plants);
  useConsole((s) => s.tick);

  const groups = processGroupHealth(facilityId);

  return (
    <nav
      className={clsx(
        'chrome relative z-20 flex shrink-0 flex-col border-r-2 border-line bg-shell-900 transition-[width] duration-200',
        expanded ? 'w-[228px]' : 'w-[64px]',
      )}
    >
      <div className="flex items-center justify-between border-b-2 border-line px-3 py-2">
        {expanded && <span className="label-xs">Navigation</span>}
        <button
          type="button"
          onClick={toggle}
          aria-label="Toggle navigation rail"
          className="focus-hard ml-auto border border-line px-1.5 py-0.5 text-[9px] text-faint transition-colors hover:border-flow hover:text-flow"
        >
          {expanded ? '\u25C0' : '\u25B6'}
        </button>
      </div>

      <div className="flex flex-col py-1">
        {NAV.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={clsx(
                'group relative flex items-center gap-3 px-3 py-2.5 transition-colors',
                active ? 'bg-flow/10 text-flow' : 'text-slate-400 hover:bg-shell-850 hover:text-slate-100',
              )}
            >
              {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-flow" />}
              <Icon name={item.icon} />
              {expanded && (
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase leading-none tracking-[0.12em]">
                    {item.label}
                  </span>
                  <span className="label-xs mt-1 block normal-case tracking-normal">
                    {item.hint}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* The nav doubles as a live miniature of the treatment train. */}
      <div className="mt-2 border-t-2 border-line pt-3">
        {expanded && <div className="label-xs px-3 pb-2">Process Train</div>}
        <div className="flex flex-col gap-px px-2 pb-3">
          {groups.map((group, index) => (
            <div key={group.id} className="relative">
              {index < groups.length - 1 && (
                <span className="absolute left-[13px] top-full z-0 h-2 w-px bg-line" />
              )}
              <div
                className={clsx(
                  'relative flex items-center gap-2.5 border-2 px-2 py-1.5',
                  group.flagged > 0 ? 'border-line-bright' : 'border-line/60',
                  group.severity === 'critical' && 'hazard-stripe',
                  group.severity === 'warning' && 'hazard-stripe-amber',
                )}
              >
                <span
                  className="size-2.5 shrink-0"
                  style={{ backgroundColor: SEVERITY_COLOR[group.severity] }}
                />
                {expanded ? (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-300">
                      {group.label}
                    </span>
                    <span
                      className="text-[10px] font-semibold tnum"
                      style={{
                        color:
                          group.flagged > 0 ? SEVERITY_COLOR[group.severity] : '#4d6b85',
                      }}
                    >
                      {group.flagged > 0 ? group.flagged : group.total}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-faint tnum">{group.total}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t-2 border-line px-3 py-2">
        {expanded ? (
          <div className="label-xs leading-relaxed">
            {site.shortName}
            <br />
            <span className="text-faint/70 normal-case tracking-normal">
              {site.population > 0
                ? `${site.population.toLocaleString()} PE served`
                : site.kind === 'reservoir'
                  ? 'Receiving water body'
                  : 'Industrial catchment'}
            </span>
          </div>
        ) : (
          <div className="size-2 bg-nominal" />
        )}
      </div>
    </nav>
  );
}
