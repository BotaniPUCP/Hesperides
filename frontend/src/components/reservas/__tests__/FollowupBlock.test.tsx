import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { FollowupBlock } from '../FollowupBlock';

jest.mock('@/lib/reservations-api', () => ({
  reservationsApi: {
    confirmUse: jest.fn(),
    recordUsage: jest.fn(),
  },
}));

const { reservationsApi } = jest.requireMock('@/lib/reservations-api') as {
  reservationsApi: { confirmUse: jest.Mock; recordUsage: jest.Mock };
};

const ENTRIES = [
  { value: true, at: '2026-11-11T09:00:00-05:00', by: 'coordinador@demo.invalid' },
];

function renderBlock(overrides: Partial<Parameters<typeof FollowupBlock>[0]> = {}) {
  const onChanged = jest.fn();
  render(
    <FollowupBlock
      code="RES-0001"
      kind="usage"
      version={2}
      value={false}
      entries={[]}
      open
      canChange
      labelOn="El espacio está siendo usado"
      labelOff="No se está usando"
      buttonLabel="Marcar en uso"
      buttonOff="Quitar marca de uso"
      blockedText="El espacio solo se marca en uso durante el horario de la reserva."
      onChanged={onChanged}
      {...overrides}
    />);
  return onChanged;
}

describe('FollowupBlock', () => {
  it('marca el uso y avisa con la reserva actualizada', async () => {
    const saved = { code: 'RES-0001', spaceUsed: true };
    reservationsApi.recordUsage.mockResolvedValue(saved);
    const onChanged = renderBlock();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar en uso' }));
    await waitFor(() => expect(reservationsApi.recordUsage).toHaveBeenCalledWith('RES-0001', true, 2));
    expect(onChanged).toHaveBeenCalledWith(saved);
  });

  it('quita la marca cuando ya está puesta', async () => {
    reservationsApi.recordUsage.mockResolvedValue({ code: 'RES-0001', spaceUsed: false });
    renderBlock({ value: true });

    fireEvent.click(screen.getByRole('button', { name: 'Quitar marca de uso' }));
    await waitFor(() => expect(reservationsApi.recordUsage).toHaveBeenCalledWith('RES-0001', false, 2));
  });

  it('confirma por el endpoint de confirmación', async () => {
    reservationsApi.confirmUse.mockResolvedValue({ code: 'RES-0001', useConfirmed: true });
    renderBlock({ kind: 'confirmation', buttonLabel: 'Registrar confirmación' });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar confirmación' }));
    await waitFor(() => expect(reservationsApi.confirmUse).toHaveBeenCalledWith('RES-0001', true, 2));
  });

  it('sin ventana abierta no ofrece el botón y explica por qué', () => {
    renderBlock({ open: false });

    expect(screen.queryByRole('button', { name: 'Marcar en uso' })).not.toBeInTheDocument();
    expect(screen.getByText('El espacio solo se marca en uso durante el horario de la reserva.')).toBeInTheDocument();
  });

  it('sin permiso tampoco ofrece el botón', () => {
    renderBlock({ canChange: false });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/durante el horario/)).not.toBeInTheDocument();
  });

  it('lista los cambios anteriores con fecha y quién', () => {
    renderBlock({ entries: ENTRIES, value: true });

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('El espacio está siendo usado —');
    expect(items[0]).toHaveTextContent('por coordinador@demo.invalid');
  });

  it('muestra el error traducido cuando la ventana cerró', async () => {
    reservationsApi.recordUsage.mockRejectedValue(new ApiError(422,
      'The confirmation window is closed: it closes 20 minutes before the reservation ends'));
    renderBlock();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar en uso' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El plazo de confirmación ya cerró: solo se confirma hasta 20 minutos antes del fin de la reserva.');
  });
});
