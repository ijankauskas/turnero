'use client';

import { AppShell } from '../../components/app-shell';

export default function ConfigPage() {
  return (
    <AppShell allow={['ADMINISTRADOR']}>
      <section style={{ padding: '1.25rem' }}>
        <h1>Configuración</h1>
        <ul>
          <li>
            <a href="/config/empresa">Empresa y branding</a>
          </li>
          <li>
            <a href="/config/sucursales">Sucursales</a>
          </li>
          <li>
            <a href="/config/usuarios">Usuarios</a>
          </li>
          <li>
            <a href="/config/profesionales">Profesionales y horarios</a>
          </li>
        </ul>
      </section>
    </AppShell>
  );
}
