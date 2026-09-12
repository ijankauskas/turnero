import type { CSSProperties, ReactNode } from 'react';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export const pageClass = 'mx-auto w-full max-w-6xl px-5 py-6 md:px-7';

export const cardClass =
  'rounded-xl border border-line bg-paper shadow-soft';

export const controlClass =
  'mt-1.5 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-canvas disabled:text-muted';

export const inputClass = cn(controlClass, 'block w-full');

export const textareaClass = cn(inputClass, 'min-h-[92px] resize-y');

export const labelClass = 'block text-[13px] font-medium text-ink';

export const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50';

export const btnSoft =
  'inline-flex items-center justify-center rounded-lg bg-canvas px-3 py-2 text-sm font-medium text-ink transition hover:bg-line disabled:cursor-not-allowed disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50';

export const thClass =
  'border-b border-line bg-canvas px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted';

export const tdClass = 'border-b border-line px-4 py-3 text-sm text-ink';

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
          <p className="mb-1 text-xs font-medium text-muted">{kicker}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
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
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {children}
    </p>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          cardClass,
          'max-h-[90vh] w-full overflow-auto',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="m-0 text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className={btnGhost}>
            Cerrar
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Pager({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span>
        {total} resultado{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnGhost}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <span>
          Página {page} de {pageCount}
        </span>
        <button
          type="button"
          className={btnGhost}
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export function apptSurface(hex: string | null | undefined): CSSProperties {
  const color = hex || '#2563eb';
  return {
    background: `color-mix(in srgb, ${color} 38%, white)`,
    borderLeft: `4px solid ${color}`,
    color: '#0f172a',
  };
}
