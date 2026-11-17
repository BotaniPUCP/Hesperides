import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefinitiveDeactivationModal } from '../DefinitiveDeactivationModal';

describe('DefinitiveDeactivationModal', () => {
  it('requires a reason and sends the trimmed reason before closing', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onCancel = jest.fn();
    render(<DefinitiveDeactivationModal entityLabel="Ejemplar EV-000001" onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeDisabled();
    expect(screen.getByRole('dialog')).toHaveTextContent(/no se borrarán sus historiales ni se podrá reactivar/i);
    await user.type(screen.getByLabelText('Motivo de la baja'), '  Retiro en campo  ');
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));

    expect(onConfirm).toHaveBeenCalledWith('Retiro en campo');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and displays an API error', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockRejectedValue(new Error('No se pudo guardar'));
    render(<DefinitiveDeactivationModal entityLabel="Especie de prueba" onConfirm={onConfirm} onCancel={jest.fn()} />);

    await user.type(screen.getByLabelText('Motivo de la baja'), 'Cambio de inventario');
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('blocks a second confirmation while the first request is pending', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onConfirm = jest.fn(() => new Promise<void>((done) => { resolve = done; }));
    render(<DefinitiveDeactivationModal entityLabel="Ejemplar EV-000001" onConfirm={onConfirm} onCancel={jest.fn()} />);

    await user.type(screen.getByLabelText('Motivo de la baja'), 'Retiro');
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeDisabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
  });

  it('adapts title and warning when the entity still has living specimens', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <DefinitiveDeactivationModal
        entityLabel="Tara (Caesalpinia spinosa)"
        activeCount={17}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText('Confirmar proceso de retiro')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(/Esta especie aún tiene 17 ejemplares vivos en el campus/i);
    expect(screen.getByRole('button', { name: 'Confirmar retiro' })).toBeDisabled();

    await user.type(screen.getByLabelText('Motivo del retiro'), 'Especie en declive');
    expect(screen.getByRole('button', { name: 'Confirmar retiro' })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }));

    expect(onConfirm).toHaveBeenCalledWith('Especie en declive');
  });
});
