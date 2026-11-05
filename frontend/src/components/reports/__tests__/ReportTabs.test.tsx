import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportTabs } from '../ReportTabs';

const tabs = ['semanal', 'mensual', 'direccion'] as const;

function setup(active: (typeof tabs)[number] = 'mensual') {
  const onActivate = jest.fn();
  render(<ReportTabs tabs={tabs} active={active} onActivate={onActivate} />);
  return { onActivate, user: userEvent.setup() };
}

describe('ReportTabs (SPEC-202 §7.2, CA-G02)', () => {
  it('expone tablist, tab y aria-selected con tabIndex móvil', () => {
    setup();
    expect(screen.getByRole('tablist', { name: 'Reportes' })).toBeInTheDocument();
    const selected = screen.getByRole('tab', { name: 'Mensual de la sección' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('tabindex', '0');
    expect(selected).toHaveAttribute('aria-controls', 'report-panel-mensual');
    expect(screen.getByRole('tab', { name: 'Semanal del sector' })).toHaveAttribute('tabindex', '-1');
  });

  it('las flechas mueven el foco en ciclo e Inicio/Fin van a los extremos, sin activar', async () => {
    const { onActivate, user } = setup();
    await user.tab();
    expect(screen.getByRole('tab', { name: 'Mensual de la sección' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Resumen para OSG' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Semanal del sector' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Resumen para OSG' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Semanal del sector' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Resumen para OSG' })).toHaveFocus();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('Enter y Espacio activan la pestaña enfocada', async () => {
    const { onActivate, user } = setup();
    await user.tab();
    await user.keyboard('{ArrowLeft}{Enter}');
    expect(onActivate).toHaveBeenLastCalledWith('semanal');
    await user.keyboard('{End} ');
    expect(onActivate).toHaveBeenLastCalledWith('direccion');
  });

  it('en móvil son botones del mismo ancho, de 44 px de alto y con rótulo corto', () => {
    setup();
    expect(screen.getByRole('tablist')).toHaveClass('grid', 'auto-cols-fr', 'grid-flow-col');
    for (const tab of screen.getAllByRole('tab')) expect(tab).toHaveClass('min-h-11', 'min-w-0');
    expect(screen.getByText('OSG')).toHaveClass('sm:hidden');
  });
});
