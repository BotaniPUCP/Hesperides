import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ContactSummary } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { ContactPicker } from '../ContactPicker';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { contacts: jest.fn(), similarContacts: jest.fn(), createContact: jest.fn(), linkContact: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;
const PSICOLOGIA = { code: 'ORG-0031', name: 'CF Psicología', active: true };
const juanDiego: ContactSummary = {
  code: 'CON-0007', fullName: 'Juan Diego Villasante', extension: '4549', mobile: null, email: null,
  organizations: [{ code: 'ORG-0012', name: 'OIE', active: true }],
};
const page = (items: ContactSummary[]) => ({ page: 0, size: 8, total: items.length, items });

/** En la organización elegida no hay nadie; en todo el Directorio, Juan Diego en la OIE. */
function onlyInAnotherOrganization() {
  api.contacts.mockImplementation((filters) =>
    Promise.resolve(page(filters.organizationCode ? [] : [juanDiego])));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  api.similarContacts.mockResolvedValue([]);
});

describe('ContactPicker', () => {
  it('busca solo dentro de la organización elegida', async () => {
    api.contacts.mockResolvedValue(page([{ ...juanDiego, organizations: [PSICOLOGIA] }]));
    const onChange = jest.fn();
    render(<ContactPicker id="c" label="Contacto" organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Diego Villasante' }));

    expect(api.contacts).toHaveBeenCalledWith(expect.objectContaining({ search: 'juan', organizationCode: 'ORG-0031' }), 0);
    expect(onChange).toHaveBeenCalledWith({ code: 'CON-0007', fullName: 'Juan Diego Villasante' });
  });

  it('coordinación vincula a alguien de otra organización en vez de duplicarlo (CA-11)', async () => {
    onlyInAnotherOrganization();
    api.linkContact.mockResolvedValue(null);
    const onChange = jest.fn();
    render(<ContactPicker id="c" label="Contacto" organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular a CF Psicología' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ code: 'CON-0007', fullName: 'Juan Diego Villasante' }));
    expect(api.linkContact).toHaveBeenCalledWith('CON-0007', 'ORG-0031');
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
    expect(api.contacts).not.toHaveBeenCalled();
  });
});
