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

type ServicePackage = {
  id: string;
  serviceId: string;
  name: string;
  sessionCount: number;
  price: number;
  validityDays: number | null;
  active: boolean;
  service?: { id: string; name: string };
};

const EMPTY = {
  name: '',
  durationMinutes: 30,
  basePrice: 10000,
  openPrice: false,
  active: true,
};

const EMPTY_PACK = {
  serviceId: '',
  name: '',
  sessionCount: 6,
  price: 50000,
  validityDays: '' as string | number,
};

export default function PrestacionesPage() {
  const [rows, setRows] = useState<Service[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [packForm, setPackForm] = useState(EMPTY_PACK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [packOpen, setPackOpen] = useState(false);

  async function load(nextPage = page, nextSearch = search) {
    const me = await apiJson<MeResponse>('/auth/me');
    setIsAdmin(me.user.role === 'ADMINISTRADOR');
    const [data, packRows] = await Promise.all([
      apiPage<Service>('/services', {
        query: nextSearch,
        page: nextPage,
        pageSize: 20,
      }),
      apiJson<ServicePackage[]>('/service-packages'),
    ]);
    setRows(data.items);
    setTotal(data.total);
    setPage(data.page);
    setPageCount(data.pageCount);
    setPackages(packRows);
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

  async function onCreatePack(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiJson('/service-packages', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: packForm.serviceId,
          name: packForm.name,
          sessionCount: Number(packForm.sessionCount),
          price: Number(packForm.price),
          validityDays: packForm.validityDays
            ? Number(packForm.validityDays)
            : null,
        }),
      });
      setPackOpen(false);
      setPackForm(EMPTY_PACK);
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

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-semibold">Packs de sesiones</h2>
            <p className="mt-1 text-sm text-muted">
              Bonos para tratamientos como depilación: se compran una vez y se
              descuentan al sacar el turno.
            </p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setError(null);
                setPackForm({
                  ...EMPTY_PACK,
                  serviceId: rows[0]?.id ?? '',
                });
                setPackOpen(true);
              }}
            >
              Nuevo pack
            </button>
          ) : null}
        </div>
        <div className={cn(cardClass, 'mt-4 overflow-hidden')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Pack</th>
                <th className={thClass}>Prestación</th>
                <th className={cn(thClass, 'text-center')}>Sesiones</th>
                <th className={cn(thClass, 'text-right')}>Precio</th>
                <th className={cn(thClass, 'text-center')}>Vigencia</th>
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <tr>
                  <td className={tdClass} colSpan={5}>
                    Todavía no hay packs. Creá uno para una prestación de
                    sesión.
                  </td>
                </tr>
              ) : (
                packages.map((row) => (
                  <tr key={row.id} className="hover:bg-canvas">
                    <td className={tdClass}>{row.name}</td>
                    <td className={tdClass}>{row.service?.name ?? '—'}</td>
                    <td className={cn(tdClass, 'text-center')}>
                      {row.sessionCount}
                    </td>
                    <td className={cn(tdClass, 'text-right')}>
                      ${row.price.toLocaleString('es-AR')}
                    </td>
                    <td className={cn(tdClass, 'text-center')}>
                      {row.validityDays
                        ? `${row.validityDays} días`
                        : 'Sin vencimiento'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              {editingId && !form.openPrice ? (
                <p className="text-xs text-muted">
                  Se actualiza también en los profesionales que ofrecen este
                  servicio. Los turnos ya cargados no cambian.
                </p>
              ) : null}
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
        {packOpen ? (
          <Modal title="Nuevo pack de sesiones" onClose={() => setPackOpen(false)}>
            {error ? <Alert>{error}</Alert> : null}
            <form onSubmit={onCreatePack} className="grid gap-3">
              <label className={labelClass}>
                Prestación (sesión unitaria)
                <select
                  value={packForm.serviceId}
                  onChange={(e) =>
                    setPackForm({ ...packForm, serviceId: e.target.value })
                  }
                  required
                  className={inputClass}
                >
                  <option value="">Elegí…</option>
                  {rows
                    .filter((row) => row.active)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className={labelClass}>
                Nombre del pack
                <input
                  value={packForm.name}
                  onChange={(e) =>
                    setPackForm({ ...packForm, name: e.target.value })
                  }
                  placeholder="Pack depilación axilas x6"
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Cantidad de sesiones
                <input
                  type="number"
                  min={2}
                  value={packForm.sessionCount}
                  onChange={(e) =>
                    setPackForm({
                      ...packForm,
                      sessionCount: Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Precio del pack
                <input
                  type="number"
                  min={0}
                  value={packForm.price}
                  onChange={(e) =>
                    setPackForm({ ...packForm, price: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Vigencia (días, opcional)
                <input
                  type="number"
                  min={1}
                  value={packForm.validityDays}
                  onChange={(e) =>
                    setPackForm({ ...packForm, validityDays: e.target.value })
                  }
                  placeholder="Ej. 180"
                  className={inputClass}
                />
              </label>
              <button type="submit" className={btnPrimary}>
                Crear pack
              </button>
            </form>
          </Modal>
        ) : null}
      </Page>
    </AppShell>
  );
}
