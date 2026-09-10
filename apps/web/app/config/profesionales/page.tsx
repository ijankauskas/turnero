'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';
import { apiItems } from '../../../lib/paging';
import {
  Alert,
  btnDanger,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  controlClass,
  inputClass,
  labelClass,
  Page,
  PageTitle,
  tdClass,
  thClass,
} from '../../../components/ui';

type Professional = {
  id: string;
  displayName: string;
  color: string;
  title: string | null;
  active?: boolean;
  branches: Array<{ id: string; name: string }>;
};
type Block = {
  weekday: number;
  branchId: string;
  startTime: string;
  endTime: string;
  isOff: boolean;
};
type Branch = { id: string; name: string };
type CatalogService = {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  openPrice?: boolean;
  active: boolean;
};
type Offer = {
  serviceId: string;
  price: number;
  remunerationType: 'PERCENT' | 'FIXED';
  remunerationValue: number;
  active: boolean;
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ConfigProfesionalesPage() {
  const [rows, setRows] = useState<Professional[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#888888');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Block[]>([]);
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiJson<Professional[]>('/professionals'),
      apiItems<Branch>('/branches'),
      apiItems<CatalogService>('/services'),
    ])
      .then(([pros, b, services]) => {
        setRows(pros);
        setBranches(b);
        setCatalog(services);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function openFicha(id: string) {
    setSelected(id);
    setError(null);
    try {
      const [pro, blocks, matrix] = await Promise.all([
        apiJson<Professional>(`/professionals/${id}`),
        apiJson<Block[]>(`/professionals/${id}/schedule`),
        apiJson<Offer[]>(`/professionals/${id}/services`),
      ]);
      setDisplayName(pro.displayName);
      setColor(pro.color);
      setBranchIds(pro.branches.map((row) => row.id));
      setSchedule(blocks);
      const next: Record<string, Offer> = {};
      for (const item of matrix) {
        next[item.serviceId] = item;
      }
      setOffers(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function addBlock() {
    setSchedule((current) => [
      ...current,
      {
        weekday: 0,
        branchId: branchIds[0] || branches[0]?.id || '',
        startTime: '09:00',
        endTime: '18:00',
        isOff: false,
      },
    ]);
  }

  function updateBlock(index: number, patch: Partial<Block>) {
    setSchedule((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function toggleOffer(service: CatalogService, included: boolean) {
    setOffers((current) => {
      const copy = { ...current };
      if (!included) {
        delete copy[service.id];
        return copy;
      }
      copy[service.id] = current[service.id] ?? {
        serviceId: service.id,
        price: service.openPrice ? 0 : service.basePrice,
        remunerationType: 'PERCENT',
        remunerationValue: 40,
        active: true,
      };
      return copy;
    });
  }

  async function saveFicha(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/professionals/${selected}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayName, color }),
      });
      await apiJson(`/professionals/${selected}/branches`, {
        method: 'PUT',
        body: JSON.stringify({ branchIds }),
      });
      await apiJson(`/professionals/${selected}/services`, {
        method: 'PUT',
        body: JSON.stringify({
          items: Object.values(offers).map((item) => ({
            serviceId: item.serviceId,
            price: Number(item.price),
            remunerationType: item.remunerationType,
            remunerationValue: Number(item.remunerationValue),
            active: item.active,
          })),
        }),
      });
      const saved = await apiJson<Block[]>(`/professionals/${selected}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({
          blocks: schedule.map((row) => ({
            weekday: Number(row.weekday),
            branchId: row.branchId,
            startTime: row.startTime,
            endTime: row.endTime,
            isOff: row.isOff,
          })),
        }),
      });
      setSchedule(saved);
      setRows(await apiJson<Professional[]>('/professionals'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const current = rows.find((row) => row.id === selected);

  return (
    <AppShell allow={['ADMINISTRADOR']}>
      <Page className="max-w-7xl">
        <p className="mb-4">
          <a
            href="/config"
            className="text-sm text-muted underline decoration-line underline-offset-4"
          >
            ← Configuración
          </a>
        </p>
        <PageTitle kicker="Equipo">Profesionales</PageTitle>
        {error ? <Alert>{error}</Alert> : null}
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ul className="m-0 grid list-none content-start gap-2 p-0">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void openFicha(row.id)}
                  className={cn(
                    cardClass,
                    'w-full p-4 text-left transition hover:border-ink/20',
                    selected === row.id && 'border-accent bg-accent/10',
                  )}
                >
                  <span
                    className="mb-1 inline-block size-2.5 rounded-full"
                    style={{ background: row.color }}
                  />
                  <strong className="ml-2">{row.displayName}</strong>
                  {row.active === false ? (
                    <span className="text-muted"> (inactivo)</span>
                  ) : null}
                  <div className="mt-1 text-xs text-muted">
                    {row.branches.map((b) => b.name).join(', ') || 'sin sucursal'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {selected && current ? (
            <form onSubmit={saveFicha} className={cn(cardClass, 'p-5')}>
              <h2 className="mt-0 text-lg font-semibold">
                Ficha de {current.displayName}
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className={cn(labelClass, 'min-w-0 flex-1')}>
                  Nombre en agenda
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Color
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="mt-1.5 block h-[38px] w-[38px] cursor-pointer rounded-lg border border-line bg-white p-[3px]"
                  />
                </label>
              </div>
              <fieldset className="mt-4 rounded-2xl border border-line p-3">
                <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Sucursales
                </legend>
                {branches.map((row) => (
                  <label key={row.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={branchIds.includes(row.id)}
                      onChange={(e) => {
                        setBranchIds((currentIds) =>
                          e.target.checked
                            ? [...currentIds, row.id]
                            : currentIds.filter((id) => id !== row.id),
                        );
                      }}
                      className="size-4 rounded border-line"
                    />
                    {row.name}
                  </label>
                ))}
              </fieldset>
              <h3 className="mt-6 text-xl">Precio y comisión</h3>
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thClass}>Servicio</th>
                      <th className={cn(thClass, 'text-center')}>Ofrece</th>
                      <th className={thClass}>Precio</th>
                      <th className={thClass}>Tipo</th>
                      <th className={thClass}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((service) => {
                      const offer = offers[service.id];
                      return (
                        <tr key={service.id}>
                          <td className={tdClass}>
                            {service.name} ({service.durationMinutes} min)
                          </td>
                          <td className={cn(tdClass, 'text-center')}>
                            <input
                              type="checkbox"
                              checked={Boolean(offer)}
                              onChange={(e) =>
                                toggleOffer(service, e.target.checked)
                              }
                              className="size-4 rounded border-line"
                            />
                          </td>
                          <td className={tdClass}>
                            {service.openPrice ? (
                              <span className="text-sm text-muted">A definir</span>
                            ) : (
                              <input
                              type="number"
                              disabled={!offer}
                              value={offer?.price ?? service.basePrice}
                              onChange={(e) =>
                                setOffers((currentOffers) => ({
                                  ...currentOffers,
                                  [service.id]: {
                                    ...currentOffers[service.id],
                                    price: Number(e.target.value),
                                  },
                                }))
                              }
                              className={cn(inputClass, 'mt-0 w-24')}
                            />
                            )}
                          </td>
                          <td className={tdClass}>
                            <select
                              disabled={!offer}
                              value={offer?.remunerationType ?? 'PERCENT'}
                              onChange={(e) =>
                                setOffers((currentOffers) => ({
                                  ...currentOffers,
                                  [service.id]: {
                                    ...currentOffers[service.id],
                                    remunerationType: e.target.value as
                                      | 'PERCENT'
                                      | 'FIXED',
                                  },
                                }))
                              }
                              className={cn(inputClass, 'mt-0 w-24')}
                            >
                              <option value="PERCENT">%</option>
                              <option value="FIXED">Fijo</option>
                            </select>
                          </td>
                          <td className={tdClass}>
                            <input
                              type="number"
                              disabled={!offer}
                              value={offer?.remunerationValue ?? 40}
                              onChange={(e) =>
                                setOffers((currentOffers) => ({
                                  ...currentOffers,
                                  [service.id]: {
                                    ...currentOffers[service.id],
                                    remunerationValue: Number(e.target.value),
                                  },
                                }))
                              }
                              className={cn(inputClass, 'mt-0 w-24')}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <h3 className="mt-6 text-xl">Horario semanal</h3>
              <p className="text-[13px] text-muted">
                Un profesional no puede tener dos sucursales el mismo día a la
                misma hora.
              </p>
              {schedule.map((block, index) => (
                <div
                  key={`${block.weekday}-${index}`}
                  className="mb-2 flex flex-wrap items-center gap-2"
                >
                  <select
                    value={block.weekday}
                    onChange={(e) =>
                      updateBlock(index, { weekday: Number(e.target.value) })
                    }
                    className={cn(controlClass, 'mt-0')}
                  >
                    {DAYS.map((day, weekday) => (
                      <option key={day} value={weekday}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <select
                    value={block.branchId}
                    onChange={(e) =>
                      updateBlock(index, { branchId: e.target.value })
                    }
                    className={cn(controlClass, 'mt-0')}
                  >
                    {branches.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={block.startTime}
                    onChange={(e) =>
                      updateBlock(index, { startTime: e.target.value })
                    }
                    className={cn(controlClass, 'mt-0')}
                  />
                  <input
                    type="time"
                    value={block.endTime}
                    onChange={(e) =>
                      updateBlock(index, { endTime: e.target.value })
                    }
                    className={cn(controlClass, 'mt-0')}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={block.isOff}
                      onChange={(e) =>
                        updateBlock(index, { isOff: e.target.checked })
                      }
                      className="size-4 rounded border-line"
                    />
                    Franco
                  </label>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() =>
                      setSchedule((currentBlocks) =>
                        currentBlocks.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={addBlock} className={btnGhost}>
                  Agregar bloque
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  Guardar ficha
                </button>
                {current.active !== false ? (
                  <button
                    type="button"
                    className={btnDanger}
                    onClick={() =>
                      void apiJson(`/professionals/${current.id}/deactivate`, {
                        method: 'POST',
                      })
                        .then(() =>
                          setRows((rows) =>
                            rows.map((row) =>
                              row.id === current.id
                                ? { ...row, active: false }
                                : row,
                            ),
                          ),
                        )
                        .catch((err: Error) => setError(err.message))
                    }
                  >
                    Desactivar
                  </button>
                ) : (
                  <span className="text-sm text-muted">
                    Inactivo: no entra en el alta de turnos.
                  </span>
                )}
              </div>
            </form>
          ) : null}
        </div>
      </Page>
    </AppShell>
  );
}
