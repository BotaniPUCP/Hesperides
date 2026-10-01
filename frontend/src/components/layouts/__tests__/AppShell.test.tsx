import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../AppShell';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'x@pucp.edu.pe', fullName: 'Persona Prueba', role: { code: 'ADMIN', label: 'Administrador' } },
    logout: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('AppShell', () => {
  it('muestra el contenido de la página junto al sidebar', () => {
    render(
      <AppShell>
        <p>contenido de la página</p>
      </AppShell>,
    );

    expect(screen.getByText('contenido de la página')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /principal/i })).toBeInTheDocument();
  });

  it('en móvil abre el menú como panel y lo cierra con Escape', async () => {
    render(
      <AppShell>
        <p>contenido</p>
      </AppShell>,
    );
    const abrir = screen.getByRole('button', { name: /abrir menú/i });
    expect(abrir).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(abrir);
    expect(screen.getByRole('dialog', { name: /menú/i })).toBeInTheDocument();
    expect(abrir).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /menú/i })).not.toBeInTheDocument();
  });

  it('cierra el panel móvil al tocar fuera de él', async () => {
    render(
      <AppShell>
        <p>contenido</p>
      </AppShell>,
    );

    await userEvent.click(screen.getByRole('button', { name: /abrir menú/i }));
    await userEvent.click(screen.getByTestId('menu-overlay'));

    expect(screen.queryByRole('dialog', { name: /menú/i })).not.toBeInTheDocument();
  });

  it('cierra el panel móvil al navegar a otra página', async () => {
    render(
      <AppShell>
        <p>contenido</p>
      </AppShell>,
    );

    await userEvent.click(screen.getByRole('button', { name: /abrir menú/i }));
    const panel = screen.getByRole('dialog', { name: /menú/i });
    await userEvent.click(within(panel).getByRole('link', { name: /inicio/i }));

    expect(screen.queryByRole('dialog', { name: /menú/i })).not.toBeInTheDocument();
  });
});
