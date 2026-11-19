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
  it('renders list of selected specimens, navigates to step 2 review, and confirms', async () => {
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

    const continueBtn = screen.getByRole('button', { name: 'Continuar →' });
    expect(continueBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/Motivo del retiro/i), 'Retiro por obras civiles');
    expect(continueBtn).toBeEnabled();
    await user.click(continueBtn);

    // Paso 2: Resumen y confirmación final
    expect(screen.getByText(/Resumen de la baja definitiva \(2 ejemplares\) · Paso 2 de 2/)).toBeInTheDocument();
    expect(screen.getByText(/Impacto de la acción:/)).toBeInTheDocument();
    expect(screen.getByText(/Retiro por obras civiles/)).toBeInTheDocument();

    // Permite regresar a editar con Atrás
    await user.click(screen.getByRole('button', { name: '← Atrás' }));
    expect(screen.getByText(/Paso 1 de 2/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo del retiro/i)).toHaveValue('Retiro por obras civiles');
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));

    const submitBtn = screen.getByRole('button', { name: /Dar de baja 2 ejemplares/i });
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
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));
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

  it('paginates specimens in step 1 and collapses codes with +N more in step 2 when count is large', async () => {
    const user = userEvent.setup();
    const manySpecimens: Specimen[] = Array.from({ length: 12 }, (_, i) => ({
      code: `EV-${String(i + 1).padStart(6, '0')}`,
      speciesSlug: 'ficus-benjamina',
      speciesCommonName: `Ficus ${i + 1}`,
      sourceLocation: `Sector ${i + 1}`,
      sourceReference: null,
      latitude: null,
      longitude: null,
      photoUrl: null,
      imageUrl: null,
      thumbnailUrl: null,
      quantity: 1,
      notes: null,
    }));

    render(
      <BulkDeactivationModal
        isOpen
        specimens={manySpecimens}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    // Paso 1: muestra página 1 de 3 (ejemplares 1 a 5)
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('EV-000005')).toBeInTheDocument();
    expect(screen.queryByText('EV-000006')).not.toBeInTheDocument();

    // Navegar a página 2
    await user.click(screen.getByRole('button', { name: 'Página siguiente de ejemplares' }));
    expect(screen.getByText('EV-000006')).toBeInTheDocument();
    expect(screen.queryByText('EV-000001')).not.toBeInTheDocument();

    // Llenar motivo y pasar al Paso 2
    await user.type(screen.getByLabelText(/Motivo del retiro/i), 'Obras generales');
    await user.click(screen.getByRole('button', { name: 'Continuar →' }));

    // Paso 2: Solo primeros 8 chips visibles + botón '+4 más (ver todos)'
    expect(screen.getByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('EV-000008')).toBeInTheDocument();
    expect(screen.queryByText('EV-000009')).not.toBeInTheDocument();

    const expandBtn = screen.getByRole('button', { name: '+4 más (ver todos)' });
    expect(expandBtn).toBeInTheDocument();

    // Expandir para ver todos
    await user.click(expandBtn);
    expect(screen.getByText('EV-000009')).toBeInTheDocument();
    expect(screen.getByText('EV-000012')).toBeInTheDocument();

    // Colapsar
    await user.click(screen.getByRole('button', { name: 'Mostrar menos' }));
    expect(screen.queryByText('EV-000009')).not.toBeInTheDocument();
  });
});
