'use client';

import { AppShell } from './app-shell';

export default function PlaceholderPage({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <AppShell>
      <section style={{ padding: '1.5rem 1.25rem' }}>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p>{note}</p>
      </section>
    </AppShell>
  );
}
