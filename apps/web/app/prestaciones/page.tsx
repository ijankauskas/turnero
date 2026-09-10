'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';
import type { MeResponse } from '../../lib/types';
import {
  Alert,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  Page,
  PageTitle,
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
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [basePrice, setBasePrice] = useState(10000);
  const [openPrice, setOpenPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    const me = await apiJson<MeResponse>('/auth/me');
    setIsAdmin(me.user.role === 'ADMINISTRADOR');
    setRows(await apiJson<Service[]>('/services'));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

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
      await load();
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
        <PageTitle kicker="Catálogo">Prestaciones</PageTitle>
        {error ? <Alert>{error}</Alert> : null}
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
                        onClick={() => void patch(row.id, { active: !row.active })}
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
        </div>
        {isAdmin ? (
          <form
            onSubmit={onSubmit}
            className={cn(cardClass, 'mt-8 grid max-w-sm gap-3 p-5')}
          >
            <h2 className="m-0 text-lg font-semibold">Nueva prestación</h2>
            <input
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={inputClass}
            />
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              disabled={openPrice}
              className={inputClass}
            />
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
                  El profesional le dice a recepción qué se hizo y ahí se carga
                  el importe.
                </span>
              </span>
            </label>
            <button type="submit" className={btnPrimary}>
              Agregar
            </button>
          </form>
        ) : null}
      </Page>
    </AppShell>
  );
}
