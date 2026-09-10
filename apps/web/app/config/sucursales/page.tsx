'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiPage } from '../../../lib/paging';
import { apiJson } from '../../../lib/session';
import {
  Alert,
  btnDanger,
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

export default function ConfigSucursalesPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiJson('/branches', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address: address || undefined,
          phone: phone || undefined,
        }),
      });
      setName('');
      setAddress('');
      setPhone('');
      setOpen(false);
      setPage(1);
      setSearch('');
      setQuery('');
      await load(1, '');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function patch(id: string, data: Partial<Branch>) {
    setError(null);
    try {
      await apiJson(`/branches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      await load();
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
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
            >
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
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>
                    <input
                      defaultValue={row.name}
                      onBlur={(e) => {
                        if (e.target.value !== row.name) {
                          void patch(row.id, { name: e.target.value });
                        }
                      }}
                      className={cn(inputClass, 'mt-0')}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      placeholder="Dirección"
                      defaultValue={row.address ?? ''}
                      onBlur={(e) => {
                        if ((e.target.value || null) !== row.address) {
                          void patch(row.id, {
                            address: e.target.value || null,
                          });
                        }
                      }}
                      className={cn(inputClass, 'mt-0')}
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      placeholder="Teléfono"
                      defaultValue={row.phone ?? ''}
                      onBlur={(e) => {
                        if ((e.target.value || null) !== row.phone) {
                          void patch(row.id, {
                            phone: e.target.value || null,
                          });
                        }
                      }}
                      className={cn(inputClass, 'mt-0')}
                    />
                  </td>
                  <td className={cn(tdClass, 'text-right')}>
                    {row.active === false ? (
                      <span className="text-sm text-muted">Inactiva</span>
                    ) : (
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => void patch(row.id, { active: false })}
                      >
                        Desactivar
                      </button>
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
            title="Nueva sucursal"
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
                Dirección
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Teléfono
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
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
