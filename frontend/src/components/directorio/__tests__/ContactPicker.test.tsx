import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ContactSummary } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { contact } from '@/test-utils/directoryFixtures';
import { ContactPicker } from '../ContactPicker';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: {
    allContacts: jest.fn(), createContact: jest.fn(),
    linkContact: jest.fn(), updateLinkRole: jest.fn(),
  },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;
const PSICOLOGIA = { code: 'ORG-0031', name: 'CF Psicología', active: true };
const juanDiego: ContactSummary = contact('CON-0007', 'Juan Diego Villasante',
  [{ code: 'ORG-0012', name: 'OIE', active: true }], { extension: '4549' });

/** En la organización elegida no hay nadie; en todo el Directorio, Juan Diego en la OIE. */
function onlyInAnotherOrganization() {
  api.allContacts.mockResolvedValue([juanDiego]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
});

describe('ContactPicker', () => {
  it('busca solo dentro de la organización elegida', async () => {
    api.allContacts.mockResolvedValue([
      contact('CON-0007', 'Juan Diego Villasante', [PSICOLOGIA]),
      contact('CON-0008', 'Juana Ríos', [{ code: 'ORG-0012', name: 'OIE', active: true }]),
    ]);
    const onChange = jest.fn();
    render(<ContactPicker id="c" label="Contacto" organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Diego Villasante' }));

    expect(screen.queryByText('Juana Ríos')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith({ code: 'CON-0007', fullName: 'Juan Diego Villasante' });
  });

  it('coordinación vincula a alguien de otra organización en vez de duplicarlo (CA-11)', async () => {
    onlyInAnotherOrganization();
    api.linkContact.mockResolvedValue(null);
    const onChange = jest.fn();
    render(<ContactPicker id="c" label="Contacto" organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular a CF Psicología' }));

    // El vínculo se crea desde el diálogo del rol (SPEC-106 §4.3).
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ code: 'CON-0007', fullName: 'Juan Diego Villasante' }));
    expect(api.linkContact).toHaveBeenCalledWith('CON-0007', 'ORG-0031', null);
    expect(api.createContact).not.toHaveBeenCalled();
  });

  it('vincular pide el rol opcional del vínculo', async () => {
    onlyInAnotherOrganization();
    api.linkContact.mockResolvedValue(null);
    const onChange = jest.fn();
    render(<ContactPicker id="c" label="Contacto" organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular a CF Psicología' }));
    fireEvent.change(await screen.findByLabelText('Rol en la organización'), { target: { value: 'Delegado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(api.linkContact).toHaveBeenCalledWith('CON-0007', 'ORG-0031', 'Delegado'));
  });

  it('un contacto que ya pertenece ofrece editar su rol, no crea otro vínculo', async () => {
    onlyInAnotherOrganization();
    api.linkContact.mockRejectedValue({ status: 409, message: 'The contact CON-0007 already belongs to «CF Psicología»' });
    const onChange = jest.fn();
    render(<ContactPicker id="c" label="Contacto" organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular a CF Psicología' }));

    // El primer intento responde 409: el diálogo pasa a editar el rol del vínculo.
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular' }));
    await screen.findByText(/ya pertenece a CF Psicología/i);
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(api.updateLinkRole).toHaveBeenCalledWith('CON-0007', 'ORG-0031', null));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ code: 'CON-0007', fullName: 'Juan Diego Villasante' }));
    expect(api.createContact).not.toHaveBeenCalled();
  });

  it('el capataz no vincula ni registra contactos', async () => {
    mockRole.current = 'SUPERVISOR';
    onlyInAnotherOrganization();
    render(<ContactPicker id="c" label="Contacto" organization={PSICOLOGIA} value={null} onChange={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });

    expect(await screen.findByText(/pide a coordinación/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Vincular|Registrar/ })).not.toBeInTheDocument();
  });

  it('sin organización elegida no busca', () => {
    render(<ContactPicker id="c" label="Contacto" organization={null} value={null} onChange={jest.fn()} />);

    expect(screen.getByText(/elige primero la organización/i)).toBeInTheDocument();
    expect(api.allContacts).not.toHaveBeenCalled();
  });
});
