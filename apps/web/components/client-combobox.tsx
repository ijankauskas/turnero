'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type UIEvent,
} from 'react';
import { apiPage } from '../lib/paging';
import {
  ClientCreateModal,
  type ClientOption,
} from './client-create-modal';
import { btnGhost, cn, controlClass } from './ui';

function labelOf(row: ClientOption) {
  return `${row.lastName}, ${row.firstName} · ${row.phone}`;
}

export function ClientCombobox({
  value,
  selectedLabel,
  onChange,
  className,
}: {
  value: string;
  selectedLabel?: string;
  onChange: (client: ClientOption | null) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ClientOption[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const requestRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void loadPage(1, query, false);
    }, 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  async function loadPage(nextPage: number, nextQuery: string, append: boolean) {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const data = await apiPage<ClientOption>('/clients', {
        query: nextQuery,
        page: nextPage,
        pageSize: 20,
      });
      if (requestId !== requestRef.current) return;
      const active = data.items.filter((row) => row.active !== false);
      setItems((current) => (append ? [...current, ...active] : active));
      setPage(data.page);
      setPageCount(data.pageCount);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }

  function onScroll(event: UIEvent<HTMLUListElement>) {
    const node = event.currentTarget;
    if (loading || page >= pageCount) return;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 24) {
      void loadPage(page + 1, query, true);
    }
  }

  const matched = value ? items.find((row) => row.id === value) : undefined;
  const closedLabel = selectedLabel || (matched ? labelOf(matched) : '');

  return (
    <>
      <div ref={rootRef} className={cn('relative', className)}>
        <div className="mt-1.5 flex gap-2">
          <input
            value={open || !value ? query : closedLabel}
            placeholder="Buscar por nombre o teléfono"
            onFocus={() => {
              setOpen(true);
              if (value && !query) setQuery('');
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (value) onChange(null);
            }}
            className={cn(controlClass, 'mt-0 min-w-0 flex-1')}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
          />
          <button
            type="button"
            className={cn(btnGhost, 'shrink-0 px-3')}
            onClick={() => setCreateOpen(true)}
            title="Nuevo cliente"
          >
            Nuevo
          </button>
        </div>
        {open ? (
          <ul
            id={listId}
            role="listbox"
            onScroll={onScroll}
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-paper py-1 shadow-soft"
          >
            {items.map((row) => {
              const isSelected = row.id === value;
              return (
                <li key={row.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(row);
                      setQuery(labelOf(row));
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full px-3 py-2 text-left text-sm transition',
                      isSelected
                        ? 'bg-accent/10 font-medium text-accent'
                        : 'text-ink hover:bg-canvas',
                      )}
                  >
                    {labelOf(row)}
                  </button>
                </li>
              );
            })}
            {loading ? (
              <li className="px-3 py-2 text-sm text-muted">Cargando…</li>
            ) : null}
            {!loading && items.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">
                No hay clientes con esa búsqueda.
              </li>
            ) : null}
            {!loading && page < pageCount ? (
              <li className="px-3 py-2 text-xs text-muted">
                Seguí bajando para ver más…
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      {createOpen ? (
        <ClientCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(client) => {
            onChange(client);
            setQuery(labelOf(client));
            setItems((current) => [
              client,
              ...current.filter((row) => row.id !== client.id),
            ]);
          }}
        />
      ) : null}
    </>
  );
}
