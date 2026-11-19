import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DefinitiveDeactivationModal } from '../DefinitiveDeactivationModal';

describe('DefinitiveDeactivationModal', () => {
  it('requires a reason, transitions to step 2 review, and sends the trimmed reason before closing', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onCancel = jest.fn();
    render(<DefinitiveDeactivationModal entityLabel="Ejemplar EV-000001" onConfirm={onConfirm} onCancel={onCancel} />);

    // Paso 1: botón de continuar deshabilitado sin motivo
    expect(screen.getByRole('button', { name: 'Continuar →' })).toBeDisabled();
    expect(screen.getByRole('dialog')).toHaveTextContent(/no se borrarán sus historiales/i);

    // Escribir motivo habilita Continuar
    await user.type(screen.getByLabelText('Motivo de la baja'), '  Retiro en campo  ');
    expect(screen.getByRole('button', { name: 'Continuar →' })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));

    // Paso 2: Resumen del impacto y confirmación final
    expect(screen.getByText('Resumen de la baja definitiva · Paso 2 de 2')).toBeInTheDocument();
    expect(screen.getByText(/Impacto de la acción:/i)).toBeInTheDocument();
    expect(screen.getByText(/Retiro en campo/)).toBeInTheDocument();

    // Permite regresar a editar el motivo con Atrás
    await user.click(screen.getByRole('button', { name: '← Atrás' }));
    expect(screen.getByText('Confirmar baja definitiva · Paso 1 de 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Motivo de la baja')).toHaveValue('  Retiro en campo  ');
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));

    // Confirmar en el paso 2
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(onConfirm).toHaveBeenCalledWith('Retiro en campo');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and displays an API error on failure', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockRejectedValue(new Error('No se pudo guardar'));
    render(<DefinitiveDeactivationModal entityLabel="Especie de prueba" onConfirm={onConfirm} onCancel={jest.fn()} />);

    await user.type(screen.getByLabelText('Motivo de la baja'), 'Cambio de inventario');
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));
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
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));
    await user.click(screen.getByRole('button', { name: 'Dar de baja' }));

    expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeDisabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
  });

  it('adapts title, steps and warning when the entity still has living specimens', async () => {
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

    // Paso 1
    expect(screen.getByText('Confirmar proceso de retiro · Paso 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(/Esta especie aún tiene 17 ejemplares vivos en el campus/i);
    expect(screen.getByRole('button', { name: 'Continuar →' })).toBeDisabled();

    await user.type(screen.getByLabelText('Motivo del retiro'), 'Especie en declive');
    expect(screen.getByRole('button', { name: 'Continuar →' })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));

    // Paso 2
    expect(screen.getByText('Resumen del proceso de retiro · Paso 2 de 2')).toBeInTheDocument();
    expect(screen.getByText(/17 ejemplares vivos/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar retiro' }));

    expect(onConfirm).toHaveBeenCalledWith('Especie en declive');
  });

  it('sin motivo escrito, cancelar cierra directamente; con motivo escrito, pide confirmación', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    const { rerender } = render(
      <DefinitiveDeactivationModal
        entityLabel="Ejemplar EV-000001"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );

    // Sin motivo: cancelar cierra directamente
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Con motivo escrito: cancelar pide confirmación
    onCancel.mockClear();
    rerender(
      <DefinitiveDeactivationModal
        entityLabel="Ejemplar EV-000001"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />
    );
    await user.type(screen.getByLabelText('Motivo de la baja'), 'Justificación de prueba');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    // Seguir editando conserva los datos
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('dialog', { name: 'Cambios sin guardar' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Motivo de la baja')).toHaveValue('Justificación de prueba');

    // Salir sin guardar descarta y cierra
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
