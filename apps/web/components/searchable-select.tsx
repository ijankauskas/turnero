'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { cn, controlClass } from './ui';
import type { SelectOption } from './select';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Buscar…',
  disabled,
  className,
  emptyMessage = 'No hay opciones con esa búsqueda.',
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((row) => row.value === value);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options.filter((row) => !row.disabled);
    return options.filter(
      (row) => !row.disabled && normalize(row.label).includes(needle),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open, options]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery('');
  }

  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) =>
        filtered.length ? Math.min(current + 1, filtered.length - 1) : 0,
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const row = filtered[highlight];
      if (row) pick(row.value);
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <input
        value={open ? query : (selected?.label ?? '')}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        role="combobox"
        autoComplete="off"
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery('');
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onInputKey}
        className={cn(
          controlClass,
          'w-full',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-paper py-1 shadow-soft"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{emptyMessage}</li>
          ) : (
            filtered.map((row, index) => {
              const isSelected = row.value === value;
              const isActive = index === highlight;
              return (
                <li key={row.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(row.value)}
                    className={cn(
                      'flex w-full px-3 py-2 text-left text-sm transition',
                      isSelected
                        ? 'bg-accent/10 font-medium text-accent'
                        : isActive
                          ? 'bg-canvas text-ink'
                          : 'text-ink hover:bg-canvas',
                    )}
                  >
                    {row.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
