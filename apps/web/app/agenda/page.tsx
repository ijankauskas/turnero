'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { AppointmentPanel } from '../../components/agenda/appointment-panel';
import { DayGrid } from '../../components/agenda/day-grid';
import { MiniCalendar } from '../../components/agenda/mini-calendar';
import { MonthView } from '../../components/agenda/month-view';
import { NewAppointmentForm } from '../../components/agenda/new-appointment-form';
import { WeekView } from '../../components/agenda/week-view';
import type {
  AgendaView,
  Appointment,
  Branch,
  DailyReport,
  LiveReport,
  Professional,
} from '../../components/agenda/types';
import {
  addDays,
  dateInZone,
  formatClock,
  formatLongDate,
  monthStart,
  nextMonthStart,
  startOfIsoWeek,
  todayInZone,
  zonedLocalToUtc,
} from '../../lib/datetime';
import { apiJson } from '../../lib/session';
import type { MeResponse } from '../../lib/types';
import {
  Alert,
  btnGhost,
  btnPrimary,
  btnSoft,
  cardClass,
  cn,
  controlClass,
  textareaClass,
} from '../../components/ui';

export default function AgendaPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [view, setView] = useState<AgendaView>('day');
  const [date, setDate] = useState('');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedPros, setSelectedPros] = useState<Set<string>>(new Set());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [live, setLive] = useState<LiveReport | null>(null);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [create, setCreate] = useState<{
    professionalId?: string;
    time?: string;
    date?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const noteKeyRef = useRef('');

  const timezone = me?.company.timezone ?? 'America/Argentina/Buenos_Aires';
  const role = me?.user.role;
  const isStaff = role !== 'PROFESIONAL';
  const canWrite =
    role === 'ADMINISTRADOR' ||
    role === 'ENCARGADO' ||
    role === 'RECEPCION';
  const isAdmin = role === 'ADMINISTRADOR';
  const noteBranch = branchId || me?.user.branchId || branches[0]?.id || '';

  useEffect(() => {
    void apiJson<MeResponse>('/auth/me')
      .then((row) => {
        setMe(row);
        setDate((current) => current || todayInZone(row.company.timezone));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const load = useCallback(async () => {
    if (!me || !date) return;
    const from =
      view === 'week'
        ? startOfIsoWeek(date)
        : view === 'month'
          ? monthStart(date)
          : date;
    const toExclusive =
      view === 'week'
        ? addDays(startOfIsoWeek(date), 7)
        : view === 'month'
          ? nextMonthStart(date)
          : addDays(date, 1);
    const fromIso = zonedLocalToUtc(from, '00:00', timezone).toISOString();
    const toIso = zonedLocalToUtc(toExclusive, '00:00', timezone).toISOString();
    const branchQs = branchId ? `&branchId=${branchId}` : '';
    const [pros, appts, branchRows] = await Promise.all([
      apiJson<Professional[]>('/professionals'),
      apiJson<Appointment[]>(
        `/appointments?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}${branchQs}`,
      ),
      isStaff ? apiJson<Branch[]>('/branches') : Promise.resolve([] as Branch[]),
    ]);
    const agendaPros = pros.filter((row) => row.active !== false);
    setProfessionals(agendaPros);
    setAppointments(appts);
    setBranches(branchRows);
    setSelectedPros((current) => {
      const ids = agendaPros.map((row) => row.id);
      if (current.size === 0) {
        return new Set(ids);
      }
      return new Set([...current].filter((id) => ids.includes(id)));
    });
    if (isStaff) {
      const qs = `date=${date}${branchQs}`;
      const [day, now] = await Promise.all([
        apiJson<DailyReport>(`/reports/daily?${qs}`),
        apiJson<LiveReport>(`/reports/live?${qs}`),
      ]);
      setDaily(day);
      setLive(now);
      const resolvedBranch = branchId || me.user.branchId || branchRows[0]?.id;
      if (resolvedBranch) {
        const key = `${date}|${resolvedBranch}`;
        if (noteKeyRef.current !== key) {
          const saved = await apiJson<{ body: string }>(
            `/notes?date=${date}&branchId=${resolvedBranch}`,
          );
          setNote(saved.body);
          noteKeyRef.current = key;
        }
      }
    }
  }, [me, date, view, branchId, timezone, isStaff]);

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [load]);

  const visiblePros = useMemo(() => {
    return professionals.filter((row) => {
      if (selectedPros.size && !selectedPros.has(row.id)) return false;
      if (
        branchId &&
        row.branches &&
        !row.branches.some((item) => item.id === branchId)
      ) {
        return false;
      }
      return true;
    });
  }, [professionals, selectedPros, branchId]);

  const markedDays = useMemo(() => {
    const set = new Set<string>();
    for (const item of appointments) {
      set.add(dateInZone(new Date(item.startAt), timezone));
    }
    return set;
  }, [appointments, timezone]);

  async function saveNote() {
    if (!noteBranch) return;
    await apiJson('/notes', {
      method: 'PUT',
      body: JSON.stringify({ date, branchId: noteBranch, body: note }),
    });
  }

  function openCreate(input: {
    professionalId?: string;
    time?: string;
    date?: string;
  }) {
    if (!canWrite) return;
    if (input.date && input.date !== date) {
      setDate(input.date);
      setView('day');
    }
    setCreate({
      professionalId: input.professionalId,
      time: input.time ?? '10:00',
      date: input.date ?? date,
    });
  }

  if (!me || !date) {
    return (
      <AppShell>
        <p className="px-8 py-10 text-sm text-muted">Cargando agenda…</p>
      </AppShell>
    );
  }

  const title = formatLongDate(date, timezone);

  return (
    <AppShell>
      <section className="agenda-layout mx-auto grid w-full max-w-[1600px] items-start gap-4 px-4 py-4 md:px-6">
        <aside className="grid gap-4">
          <div className={cn(cardClass, 'p-4')}>
            <MiniCalendar
              date={date}
              timeZone={timezone}
              marked={markedDays}
              onSelect={(iso) => {
                setDate(iso);
                setView('day');
              }}
            />
          </div>
          {isStaff ? (
            <fieldset className={cn(cardClass, 'p-4')}>
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Colaboradores
              </legend>
              <div className="grid gap-2">
                {professionals.map((pro) => (
                  <label
                    key={pro.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPros.has(pro.id)}
                      onChange={(e) => {
                        const next = new Set(selectedPros);
                        if (e.target.checked) next.add(pro.id);
                        else next.delete(pro.id);
                        setSelectedPros(next);
                      }}
                      className="size-4 rounded border-line"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: pro.color }}
                    />
                    <span>{pro.displayName}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {isStaff && daily ? (
            <div className={cn(cardClass, 'p-4')}>
              <h3 className="mt-0 mb-3 text-sm font-semibold">El día</h3>
              <p className="text-sm text-muted">
                {live?.inProgress[0] ? (
                  <>
                    En curso: {live.inProgress[0].serviceNameSnapshot} ·{' '}
                    {live.inProgress[0].client.firstName}
                  </>
                ) : live?.next ? (
                  <>
                    Próximo: {formatClock(live.next.startAt, timezone)} ·{' '}
                    {live.next.serviceNameSnapshot}
                  </>
                ) : (
                  'Sin turnos en curso'
                )}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-muted">
                    Turnos
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums">{daily.count}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-muted">
                    Ocupación
                  </dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {daily.occupancyPercent}%
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">
                    Facturado
                  </dt>
                  <dd className="font-medium">
                    ${daily.facturado.toLocaleString('es-AR')}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] uppercase tracking-wider text-muted">
                    Ticket medio
                  </dt>
                  <dd>
                    ${Math.round(daily.averageTicket).toLocaleString('es-AR')}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}
          {isStaff ? (
            <div className={cn(cardClass, 'p-4')}>
              <h3 className="mt-0 mb-3 text-sm font-semibold">Notas del día</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className={textareaClass}
              />
              <button
                type="button"
                className={cn(btnGhost, 'mt-3')}
                onClick={() =>
                  void saveNote().catch((err: Error) => setError(err.message))
                }
              >
                Guardar nota
              </button>
            </div>
          ) : null}
        </aside>

        <div>
          <header className="mb-4 flex flex-wrap items-center gap-2">
            <h1 className="mr-2 text-xl font-semibold capitalize tracking-tight">
              {title}
            </h1>
            <button
              type="button"
              className={btnSoft}
              onClick={() =>
                setDate(
                  addDays(
                    date,
                    view === 'month' ? -30 : view === 'week' ? -7 : -1,
                  ),
                )
              }
            >
              ‹
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => setDate(todayInZone(timezone))}
            >
              Hoy
            </button>
            <button
              type="button"
              className={btnSoft}
              onClick={() =>
                setDate(
                  addDays(
                    date,
                    view === 'month' ? 30 : view === 'week' ? 7 : 1,
                  ),
                )
              }
            >
              ›
            </button>
            <div className="flex rounded-lg border border-line bg-white p-0.5">
              {(['day', 'week', 'month'] as AgendaView[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium',
                    view === item ? 'bg-accent text-white' : 'text-muted',
                  )}
                >
                  {item === 'day' ? 'Día' : item === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
            {isAdmin ? (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className={cn(controlClass, 'mt-0 min-w-[180px] py-2')}
              >
                <option value="">Todas las sucursales</option>
                {branches.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            ) : null}
            {canWrite ? (
              <button
                type="button"
                className={cn(btnPrimary, 'ml-auto')}
                onClick={() => openCreate({})}
              >
                + Nuevo turno
              </button>
            ) : null}
          </header>
          {error ? <Alert>{error}</Alert> : null}
          {view === 'day' && visiblePros.length === 0 ? (
            <p className="mb-3 text-sm text-muted">
              No hay profesionales activos para mostrar.
            </p>
          ) : null}
          {view === 'day' ? (
            <DayGrid
              professionals={visiblePros}
              appointments={appointments}
              timeZone={timezone}
              canCreate={canWrite}
              onSelect={setSelected}
              onCreateSlot={(professionalId, time) =>
                openCreate({ professionalId, time, date })
              }
            />
          ) : null}
          {view === 'week' ? (
            <WeekView
              date={date}
              timeZone={timezone}
              professionals={visiblePros}
              appointments={appointments}
              canCreate={canWrite}
              onSelect={setSelected}
              onCreateSlot={(professionalId, day) =>
                openCreate({ professionalId, date: day, time: '10:00' })
              }
              onOpenDay={(day) => {
                setDate(day);
                setView('day');
              }}
            />
          ) : null}
          {view === 'month' ? (
            <MonthView
              date={date}
              timeZone={timezone}
              appointments={appointments}
              onOpenDay={(day) => {
                setDate(day);
                setView('day');
              }}
            />
          ) : null}
        </div>

        {selected ? (
          <AppointmentPanel
            appointment={
              appointments.find((row) => row.id === selected.id) ?? selected
            }
            timeZone={timezone}
            canWrite={canWrite}
            onClose={() => setSelected(null)}
            onChanged={() => {
              void load();
            }}
          />
        ) : (
          <div />
        )}

        {create && canWrite ? (
          <NewAppointmentForm
            date={create.date ?? date}
            timezone={timezone}
            professionals={visiblePros.length ? visiblePros : professionals}
            initialProfessionalId={create.professionalId}
            initialTime={create.time}
            initialBranchId={branchId || undefined}
            onClose={() => setCreate(null)}
            onCreated={() => {
              setCreate(null);
              void load();
            }}
          />
        ) : null}
      </section>
    </AppShell>
  );
}
