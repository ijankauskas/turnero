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

const EMPTY = {
  name: '',
  durationMinutes: 30,
  basePrice: 10000,
  openPrice: false,
  active: true,
};

export default function PrestacionesPage() {
  const [rows, setRows] = useState<Service[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function closeModal() {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  function openCreate() {
    setError(null);
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(row: Service) {
    setError(null);
    setEditingId(row.id);
    setForm({
      name: row.name,
      durationMinutes: row.durationMinutes,
      basePrice: row.basePrice,
      openPrice: row.openPrice,
      active: row.active,
    });
    setOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      durationMinutes: form.durationMinutes,
      basePrice: form.openPrice ? 0 : form.basePrice,
      openPrice: form.openPrice,
      ...(editingId ? { active: form.active } : {}),
    };
    try {
      if (editingId) {
        await apiJson(`/services/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        closeModal();
        await load();
        return;
      }
      await apiJson('/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closeModal();
      setPage(1);
      setSearch('');
      setQuery('');
      await load(1, '');
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
              <button type="button" className={btnPrimary} onClick={openCreate}>
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
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>{row.name}</td>
                  <td className={cn(tdClass, 'text-center')}>
                    {row.durationMinutes}
                  </td>
                  <td className={cn(tdClass, 'text-right')}>
                    {row.openPrice
                      ? 'A definir'
                      : `$${row.basePrice.toLocaleString('es-AR')}`}
                  </td>
                  <td className={cn(tdClass, 'text-center')}>
                    {row.active ? 'Activa' : 'Inactiva'}
                  </td>
                  <td className={cn(tdClass, 'text-right')}>
                    {isAdmin ? (
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => openEdit(row)}
                      >
                        Editar
                      </button>
                    ) : null}
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
            title={editingId ? 'Editar prestación' : 'Nueva prestación'}
            onClose={closeModal}
          >
            {error ? <Alert>{error}</Alert> : null}
            <form onSubmit={onSubmit} className="grid gap-3">
              <label className={labelClass}>
                Nombre
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Duración (minutos)
                <input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Precio base
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) =>
                    setForm({ ...form, basePrice: Number(e.target.value) })
                  }
                  disabled={form.openPrice}
                  className={inputClass}
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.openPrice}
                  onChange={(e) =>
                    setForm({ ...form, openPrice: e.target.checked })
                  }
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
              {editingId ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                    className="size-4 rounded border-line"
                  />
                  Activa
                </label>
              ) : null}
              <button type="submit" className={btnPrimary}>
                {editingId ? 'Guardar' : 'Crear'}
              </button>
            </form>
          </Modal>
        ) : null}
      </Page>
    </AppShell>
  );
}
