'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';
import { apiPage } from '../../lib/paging';
import type { MeResponse } from '../../lib/types';
import {
  Alert,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  labelClass,
  Modal,
  Page,
  PageTitle,
  Pager,
  tdClass,
  thClass,
} from '../../components/ui';

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  openPrice: boolean;
  active: boolean;
};

export default function PrestacionesPage() {
  const [rows, setRows] = useState<Service[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [basePrice, setBasePrice] = useState(10000);
  const [openPrice, setOpenPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  async function load(nextPage = page, nextSearch = search) {
    const me = await apiJson<MeResponse>('/auth/me');
    setIsAdmin(me.user.role === 'ADMINISTRADOR');
    const data = await apiPage<Service>('/services', {
      query: nextSearch,
      page: nextPage,
      pageSize: 20,
    });
    setRows(data.items);
    setTotal(data.total);
    setPage(data.page);
    setPageCount(data.pageCount);
  }

  useEffect(() => {
    void load(page, search).catch((err: Error) => setError(err.message));
  }, [page, search]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiJson('/services', {
        method: 'POST',
        body: JSON.stringify({
          name,
          durationMinutes,
          basePrice: openPrice ? 0 : basePrice,
          openPrice,
        }),
      });
      setName('');
      setOpenPrice(false);
      setOpen(false);
      setPage(1);
      setSearch('');
      setQuery('');
      await load(1, '');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function patch(id: string, data: Partial<Service>) {
    setError(null);
    try {
      await apiJson(`/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell allow={['ADMINISTRADOR', 'ENCARGADO', 'RECEPCION']}>
      <Page>
        <PageTitle
          kicker="Catálogo"
          actions={
            isAdmin ? (
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
              >
                Nueva prestación
              </button>
            ) : null
          }
        >
          Prestaciones
        </PageTitle>
        <div className="mb-5 flex flex-wrap gap-2">
          <input
            placeholder="Buscar por nombre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                setSearch(query);
              }
            }}
            className={cn(inputClass, 'mt-0 max-w-sm')}
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSearch(query);
            }}
            className={btnGhost}
          >
            Buscar
          </button>
        </div>
        {error && !open ? <Alert>{error}</Alert> : null}
        <div className={cn(cardClass, 'overflow-hidden')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Nombre</th>
                <th className={cn(thClass, 'text-center')}>Minutos</th>
                <th className={cn(thClass, 'text-right')}>Precio</th>
                <th className={cn(thClass, 'text-center')}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>
                    {isAdmin ? (
                      <input
                        defaultValue={row.name}
                        onBlur={(e) => {
                          if (e.target.value !== row.name) {
                            void patch(row.id, { name: e.target.value });
                          }
                        }}
                        className={cn(inputClass, 'mt-0')}
                      />
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className={cn(tdClass, 'text-center')}>
                    {row.durationMinutes}
                  </td>
                  <td className={cn(tdClass, 'text-right')}>
                    {row.openPrice ? (
                      <div className="flex flex-col items-end gap-1">
                        <span>A definir</span>
                        {isAdmin ? (
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() =>
                              void patch(row.id, { openPrice: false })
                            }
                          >
                            Usar precio fijo
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span>${row.basePrice.toLocaleString('es-AR')}</span>
                        {isAdmin ? (
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() =>
                              void patch(row.id, { openPrice: true })
                            }
                          >
                            Precio a definir
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className={cn(tdClass, 'text-center')}>
                    {isAdmin ? (
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          void patch(row.id, { active: !row.active })
                        }
                      >
                        {row.active ? 'Desactivar' : 'Activar'}
                      </button>
                    ) : row.active ? (
                      'Activa'
                    ) : (
                      'Inactiva'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={page}
            pageCount={pageCount}
            total={total}
            onPage={setPage}
          />
        </div>
        {open ? (
          <Modal
            title="Nueva prestación"
            onClose={() => {
              setOpen(false);
              setError(null);
            }}
          >
            {error ? <Alert>{error}</Alert> : null}
            <form onSubmit={onSubmit} className="grid gap-3">
              <label className={labelClass}>
                Nombre
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Duración (minutos)
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Precio base
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  disabled={openPrice}
                  className={inputClass}
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={openPrice}
                  onChange={(e) => setOpenPrice(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-line"
                />
                <span>
                  Precio a definir después del servicio
                  <span className="mt-0.5 block text-muted">
                    El profesional le dice a recepción qué se hizo y ahí se
                    carga el importe.
                  </span>
                </span>
              </label>
              <button type="submit" className={btnPrimary}>
                Crear
              </button>
            </form>
          </Modal>
        ) : null}
      </Page>
    </AppShell>
  );
}
