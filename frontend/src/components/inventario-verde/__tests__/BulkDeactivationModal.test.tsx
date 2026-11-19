import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Specimen } from '@shared/types';
import { BulkDeactivationModal } from '../BulkDeactivationModal';

const MOCK_SPECIMENS: Specimen[] = [
  {
    code: 'EV-000001',
    speciesSlug: 'schinus-molle',
    speciesCommonName: 'Molle costeño',
    sourceLocation: 'Jardín de Letras',
    sourceReference: 'Ref-01',
    latitude: null,
    longitude: null,
    photoUrl: null,
    imageUrl: null,
    thumbnailUrl: null,
    quantity: 1,
    notes: null,
  },
  {
    code: 'EV-000002',
    speciesSlug: 'ficus-benjamina',
    speciesCommonName: 'Ficus',
    sourceLocation: 'Pabellón Z',
    sourceReference: 'Ref-02',
    latitude: null,
    longitude: null,
    photoUrl: null,
    imageUrl: null,
    thumbnailUrl: null,
    quantity: 1,
    notes: null,
  },
];

describe('BulkDeactivationModal', () => {
  it('renders list of selected specimens and disables confirm until reason is entered', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <BulkDeactivationModal
        isOpen
        specimens={MOCK_SPECIMENS}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/EV-000001/)).toBeInTheDocument();
    expect(screen.getByText(/EV-000002/)).toBeInTheDocument();
    expect(screen.getByText('Molle costeño')).toBeInTheDocument();
    expect(screen.getByText('Ficus')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Dar de baja 2 ejemplares/i });
    expect(submitBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/Motivo del retiro/i), 'Retiro por obras civiles');
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);
    expect(onConfirm).toHaveBeenCalledWith('Retiro por obras civiles');
  });

  it('displays API error if onConfirm rejects', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockRejectedValue(new Error('Conflicto: un ejemplar ya fue retirado'));

    render(
      <BulkDeactivationModal
        isOpen
        specimens={MOCK_SPECIMENS}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/Motivo del retiro/i), 'Motivo de prueba');
    await user.click(screen.getByRole('button', { name: /Dar de baja 2 ejemplares/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto: un ejemplar ya fue retirado');
  });

  it('sin motivo escrito, cancelar cierra directamente; con motivo escrito, pide confirmación', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    const { rerender } = render(
      <BulkDeactivationModal
        isOpen
        specimens={MOCK_SPECIMENS}
        onClose={onClose}
        onConfirm={jest.fn()}
      />,
    );

    // Sin motivo: cancelar cierra directamente
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Con motivo escrito: cancelar pide confirmación
    onClose.mockClear();
    rerender(
      <BulkDeactivationModal
        isOpen
        specimens={MOCK_SPECIMENS}
        onClose={onClose}
        onConfirm={jest.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/Motivo del retiro/i), 'Motivo de prueba');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Seguir editando conserva los datos
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('dialog', { name: 'Cambios sin guardar' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo del retiro/i)).toHaveValue('Motivo de prueba');

    // Salir sin guardar descarta y cierra
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
