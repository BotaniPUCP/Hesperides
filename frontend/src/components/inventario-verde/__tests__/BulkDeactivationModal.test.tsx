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
});
