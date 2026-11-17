import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { OrganizationRef } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { OrganizationPicker } from '../OrganizationPicker';
import { DirectoryCatalogProvider } from '../DirectoryCatalog';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { catalog: jest.fn(), contactsCatalog: jest.fn(), similarOrganizations: jest.fn(), createOrganization: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;

const catalogEntry = (code: string, name: string) =>
  ({ code, name, type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, active: true, aliases: [] });

const oie = catalogEntry('ORG-0001', 'OIE');

function Harness({ onPicked }: { onPicked?: (ref: OrganizationRef | null) => void }) {
  const [value, setValue] = useState<OrganizationRef | null>(null);
  const [note, setNote] = useState('borrador del formulario');
  return (
    <DirectoryCatalogProvider>
      <input aria-label="Nota" value={note} onChange={(e) => setNote(e.target.value)} />
      <OrganizationPicker id="org" label="Pedido de" value={value}
        onChange={(next) => { setValue(next); onPicked?.(next); }} />
    </DirectoryCatalogProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  api.catalog.mockResolvedValue([oie]);
  api.contactsCatalog.mockResolvedValue([]);
  api.similarOrganizations.mockResolvedValue([]);
});

describe('OrganizationPicker', () => {
  it('elige una organización del catálogo al escribir, sin llamar al backend por letra', async () => {
    const onPicked = jest.fn();
    render(<Harness onPicked={onPicked} />);

    fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: 'oie' } });
    fireEvent.click(await screen.findByRole('button', { name: 'OIE' }));

    expect(api.catalog).toHaveBeenCalledTimes(1); // Solo la precarga inicial del provider.
    expect(onPicked).toHaveBeenCalledWith({ code: 'ORG-0001', name: 'OIE', active: true });
    expect(screen.getByText('OIE')).toBeInTheDocument();
  });

  it('no sugiere una organización dada de baja', async () => {
    api.catalog.mockResolvedValue([{ ...oie, active: false }]);
    mockRole.current = 'SUPERVISOR';
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: 'oie' } });

    expect(await screen.findByText(/no está en el directorio/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OIE' })).not.toBeInTheDocument();
  });

  it('el capataz no puede registrar una organización que no existe', async () => {
    mockRole.current = 'SUPERVISOR';
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: 'Facultad de Derecho' } });

    expect(await screen.findByText(/no está en el directorio/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it('coordinación la registra ahí mismo, queda elegida y el formulario conserva lo que tenía', async () => {
    api.createOrganization.mockResolvedValue({ code: 'ORG-0009' });
    const onPicked = jest.fn();
    render(<Harness onPicked={onPicked} />);
    fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'pedido para el sábado' } });

    fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: 'Facultad de Derecho' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar «Facultad de Derecho»' }));
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Facultad de Derecho');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith({ code: 'ORG-0009', name: 'Facultad de Derecho', active: true }));
    expect(api.createOrganization).toHaveBeenCalledWith(expect.objectContaining({ name: 'Facultad de Derecho', typeCode: 'PUCP_UNIT' }));
    expect(screen.getByLabelText('Nota')).toHaveValue('pedido para el sábado');
  });
});
