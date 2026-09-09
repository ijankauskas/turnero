'use client';

import { AppShell } from '../../components/app-shell';

export default function AgendaPage() {
  return (
    <AppShell>
      <section style={{ padding: '1.5rem 1.25rem' }}>
        <h1 style={{ marginTop: 0 }}>Agenda</h1>
        <p>
          Vista día / semana / mes entra en UI-002. El backend de auth ya
          recorta el alcance por rol.
        </p>
      </section>
    </AppShell>
  );
}
