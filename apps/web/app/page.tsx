import { Page, PageTitle, cardClass, cn } from '../components/ui';

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const dynamic = 'force-dynamic';

type Health = {
  status: string;
  db?: string;
};

export default async function HomePage() {
  let health: Health | null = null;
  try {
    const response = await fetch(`${apiUrl}/health`, { cache: 'no-store' });
    if (response.ok) {
      health = (await response.json()) as Health;
    }
  } catch {
    health = null;
  }

  return (
    <Page className="py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        Turnero
      </p>
      <PageTitle>Agenda SaaS</PageTitle>
      <p className="-mt-4 max-w-xl text-muted">
        Plataforma multiempresa para sucursales, profesionales y turnos. El
        documento maestro está en <code className="rounded bg-white px-1.5 py-0.5 text-sm">docs/DOCUMENTO-MAESTRO.md</code>.
      </p>
      <section className={cn(cardClass, 'mt-8 max-w-xl p-6')}>
        <h2 className="mt-0 font-serif text-2xl">API</h2>
        {health ? (
          <p className="text-sm text-muted">
            Estado: <strong className="text-ink">{health.status}</strong>
            {health.db ? ` · base de datos ${health.db}` : null}
          </p>
        ) : (
          <p className="text-sm text-muted">
            No se pudo contactar {apiUrl}/health. Levantá la API en el puerto
            3001.
          </p>
        )}
        <p className="mt-4 flex flex-wrap gap-2">
          <a
            href="/login"
            className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
          >
            Ingresar
          </a>
          <a
            href="/e/studio-elegance/login"
            className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm"
          >
            Studio Élégance
          </a>
        </p>
      </section>
    </Page>
  );
}
