'use client';

export function WorkspaceHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="slab flex flex-wrap items-center gap-3 px-4 py-3 shadow-brut">
      <div className="min-w-0">
        <h1 className="text-[15px] font-bold uppercase leading-none tracking-[0.18em] text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="label-xs mt-1.5 normal-case tracking-normal">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="ml-auto flex flex-wrap items-center gap-1.5">{children}</div>
      )}
    </div>
  );
}
