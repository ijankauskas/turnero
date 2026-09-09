'use client';

import { AppShell } from '../../components/app-shell';
import { cardClass, cn, Page, PageTitle } from '../../components/ui';

const LINKS = [
  {
    href: '/config/empresa',
    title: 'Empresa y branding',
    note: 'Nombre, colores, logo y contacto.',
  },
  {
    href: '/config/sucursales',
    title: 'Sucursales',
    note: 'Direcciones y teléfonos del local.',
  },
  {
    href: '/config/usuarios',
    title: 'Usuarios',
    note: 'Accesos y roles del equipo.',
  },
  {
    href: '/config/profesionales',
    title: 'Profesionales y horarios',
    note: 'Agenda, sucursales, precios y comisión.',
  },
];

export default function ConfigPage() {
  return (
    <AppShell allow={['ADMINISTRADOR']}>
      <Page>
        <PageTitle kicker="Ajustes">Configuración</PageTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                cardClass,
                'block p-5 transition hover:-translate-y-0.5 hover:border-ink/20',
              )}
            >
              <h2 className="mt-0 mb-1 font-serif text-2xl">{item.title}</h2>
              <p className="m-0 text-sm text-muted">{item.note}</p>
            </a>
          ))}
        </div>
      </Page>
    </AppShell>
  );
}
