'use client';

import { AppShell } from './app-shell';
import { Page, PageTitle } from './ui';

export default function PlaceholderPage({
  title,
  note,
}: {
  title: string;
  note: string;
}) {
  return (
    <AppShell>
      <Page>
        <PageTitle>{title}</PageTitle>
        <p className="text-muted">{note}</p>
      </Page>
    </AppShell>
  );
}
