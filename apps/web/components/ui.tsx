import type { CSSProperties, ReactNode } from 'react';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export const pageClass = 'mx-auto w-full max-w-6xl px-5 py-6 md:px-8';

export const cardClass =
  'rounded-2xl border border-line/90 bg-paper shadow-soft';

export const controlClass =
  'mt-1.5 rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-muted/55 focus:border-ink/35 focus:ring-2 focus:ring-ink/10 disabled:bg-cream disabled:text-muted';

export const inputClass = cn(controlClass, 'block w-full');

export const textareaClass = cn(inputClass, 'min-h-[92px] resize-y');

export const labelClass = 'block text-[13px] font-medium text-ink/80';

export const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center rounded-full border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50';

export const btnSoft =
  'inline-flex items-center justify-center rounded-full bg-cream px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-line/70 disabled:cursor-not-allowed disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50';

export const thClass =
  'border-b border-line bg-cream/80 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted';

export const tdClass = 'border-b border-line/80 px-4 py-3 text-sm text-ink';

export function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn(pageClass, className)}>{children}</section>;
}

export function PageTitle({
  kicker,
  children,
  actions,
}: {
  kicker?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
          {children}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(cardClass, 'p-5', className)}>{children}</div>;
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {children}
    </p>
  );
}

export function apptSurface(hex: string | null | undefined): CSSProperties {
  const color = hex || '#c4a36a';
  return {
    background: `color-mix(in srgb, ${color} 22%, white)`,
    borderLeft: `3px solid ${color}`,
    color: '#3d3228',
  };
}
