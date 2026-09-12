'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiPage } from '../../../lib/paging';
import { apiJson } from '../../../lib/session';
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
} from '../../../components/ui';

type Branch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active?: boolean;
};

const EMPTY = { name: '', address: '', phone: '', active: true };

export default function ConfigSucursalesPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load(nextPage = page, nextSearch = search) {
    const data = await apiPage<Branch>('/branches', {
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

  function openEdit(row: Branch) {
    setError(null);
    setEditingId(row.id);
    setForm({
      name: row.name,
      address: row.address ?? '',
      phone: row.phone ?? '',
      active: row.active !== false,
    });
    setOpen(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      ...(editingId ? { active: form.active } : {}),
    };
    try {
      if (editingId) {
        await apiJson(`/branches/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        closeModal();
        await load();
        return;
      }
      await apiJson('/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          address: form.address || undefined,
          phone: form.phone || undefined,
        }),
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
    <AppShell allow={['ADMINISTRADOR']}>
      <Page>
        <p className="mb-4">
          <a
            href="/config"
            className="text-sm text-muted underline decoration-line underline-offset-4"
          >
            ← Configuración
          </a>
        </p>
        <PageTitle
          kicker="Locales"
          actions={
            <button type="button" className={btnPrimary} onClick={openCreate}>
              Nueva sucursal
            </button>
          }
        >
          Sucursales
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
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No hay sucursales.</p>
        ) : null}
        <div className={cn(cardClass, 'overflow-hidden')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Nombre</th>
                <th className={thClass}>Dirección</th>
                <th className={thClass}>Teléfono</th>
                <th className={thClass}>Estado</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>{row.name}</td>
                  <td className={tdClass}>{row.address ?? '—'}</td>
                  <td className={tdClass}>{row.phone ?? '—'}</td>
                  <td className={tdClass}>
                    {row.active === false ? 'Inactiva' : 'Activa'}
                  </td>
                  <td className={cn(tdClass, 'text-right')}>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => openEdit(row)}
                    >
                      Editar
                    </button>
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
            title={editingId ? 'Editar sucursal' : 'Nueva sucursal'}
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
                Dirección
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Teléfono
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                />
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
