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
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem' }}>
      <p style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}>
        Turnero
      </p>
      <h1 style={{ fontSize: 36, margin: '0.4rem 0 1rem' }}>Agenda SaaS</h1>
      <p>
        Plataforma multiempresa para sucursales, profesionales y turnos. El
        documento maestro está en <code>docs/DOCUMENTO-MAESTRO.md</code>.
      </p>
      <section
        style={{
          marginTop: 24,
          padding: 16,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ fontSize: 16, marginTop: 0 }}>API</h2>
        {health ? (
          <p>
            Estado: <strong>{health.status}</strong>
            {health.db ? ` · base de datos ${health.db}` : null}
          </p>
        ) : (
          <p>
            No se pudo contactar {apiUrl}/health. Levantá la API en el puerto
            3001.
          </p>
        )}
      </section>
    </main>
  );
}
