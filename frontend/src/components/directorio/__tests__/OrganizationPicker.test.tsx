import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { OrganizationRef } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { organization } from '@/test-utils/directoryFixtures';
import { OrganizationPicker } from '../OrganizationPicker';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { allOrganizations: jest.fn(), createOrganization: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;

function Harness({ onPicked }: { onPicked?: (ref: OrganizationRef | null) => void }) {
  const [value, setValue] = useState<OrganizationRef | null>(null);
  const [note, setNote] = useState('borrador del formulario');
  return (
    <>
      <input aria-label="Nota" value={note} onChange={(e) => setNote(e.target.value)} />
      <OrganizationPicker id="org" label="Pedido de" value={value}
        onChange={(next) => { setValue(next); onPicked?.(next); }} />
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
});

describe('OrganizationPicker', () => {
  it('elige una organización que encuentra al escribir', async () => {
    api.allOrganizations.mockResolvedValue([organization('ORG-0001', 'OIE'), organization('ORG-0002', 'DAF')]);
    const onPicked = jest.fn();
    render(<Harness onPicked={onPicked} />);

    fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: 'oie' } });
    fireEvent.click(await screen.findByRole('button', { name: 'OIE' }));

    expect(onPicked).toHaveBeenCalledWith({ code: 'ORG-0001', name: 'OIE', active: true });
    expect(screen.getByText('OIE')).toBeInTheDocument();
  });

  it('escribir no consulta por cada letra: la lista se pidió una vez (SPEC-119 CA-01)', async () => {
    api.allOrganizations.mockResolvedValue([organization('ORG-0001', 'Oficina de Intercambio', { aliases: ['OIE'] })]);
    render(<Harness />);

    for (const typed of ['o', 'oi', 'oie']) {
      fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: typed } });
    }

    expect(await screen.findByRole('button', { name: 'Oficina de Intercambio' })).toBeInTheDocument();
    expect(api.allOrganizations).toHaveBeenCalledTimes(1);
  });

  it('sin tildes ni mayúsculas', async () => {
    api.allOrganizations.mockResolvedValue([organization('ORG-0003', 'Facultad de Psicología')]);
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: 'PSICOLOGIA' } });

    expect(await screen.findByRole('button', { name: 'Facultad de Psicología' })).toBeInTheDocument();
  });

  it('el capataz no puede registrar una organización que no existe', async () => {
    mockRole.current = 'SUPERVISOR';
    api.allOrganizations.mockResolvedValue([]);
    render(<Harness />);

    fireEvent.change(screen.getByLabelText('Pedido de'), { target: { value: 'Facultad de Derecho' } });

    expect(await screen.findByText(/no está en el directorio/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it('coordinación la registra ahí mismo, queda elegida y el formulario conserva lo que tenía', async () => {
    api.allOrganizations.mockResolvedValue([]);
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
