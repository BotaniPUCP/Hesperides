import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ContactSummary, OrganizationRef } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { ContactPicker, type ContactPickerProps } from '../ContactPicker';
import { DirectoryCatalogProvider } from '../DirectoryCatalog';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: {
    catalog: jest.fn(), contactsCatalog: jest.fn(), similarContacts: jest.fn(), createContact: jest.fn(),
    linkContact: jest.fn(), updateLinkRole: jest.fn(),
  },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;
const PSICOLOGIA: OrganizationRef = { code: 'ORG-0031', name: 'CF Psicología', active: true };

const person = (code: string, fullName: string, organizations: OrganizationRef[] = []) =>
  ({ code, fullName, extension: null, mobile: null, email: null, active: true, organizations });

/** En la organización elegida no hay nadie; en todo el Directorio, Juan Diego en la OIE. */
const CATALOG = [person('CON-0007', 'Juan Diego Villasante',
  [{ code: 'ORG-0012', name: 'OIE', active: true }])];

function Harness(props: Omit<ContactPickerProps, 'id' | 'label'>) {
  return (
    <DirectoryCatalogProvider>
      <ContactPicker id="c" label="Contacto" {...props} />
    </DirectoryCatalogProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  api.catalog.mockResolvedValue([]);
  api.contactsCatalog.mockResolvedValue(CATALOG);
  api.similarContacts.mockResolvedValue([]);
});

describe('ContactPicker', () => {
  it('busca solo dentro de la organización elegida, sin llamar al backend por letra', async () => {
    api.contactsCatalog.mockResolvedValue([person('CON-0007', 'Juan Diego Villasante', [PSICOLOGIA])]);
    const onChange = jest.fn();
    render(<Harness organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Diego Villasante' }));

    expect(api.contactsCatalog).toHaveBeenCalledTimes(1); // Solo la precarga inicial del provider.
    expect(onChange).toHaveBeenCalledWith({ code: 'CON-0007', fullName: 'Juan Diego Villasante' });
  });

  it('con searchEverywhere busca en todo el Directorio y muestra sus organizaciones', async () => {
    render(<Harness organization={null} searchEverywhere value={null} onChange={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan' } });

    expect(await screen.findByText('OIE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Juan Diego Villasante' })).toBeInTheDocument();
  });

  it('coordinación vincula a alguien de otra organización en vez de duplicarlo (CA-11)', async () => {
    api.linkContact.mockResolvedValue(null);
    const onChange = jest.fn();
    render(<Harness organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular a CF Psicología' }));

    // El vínculo se crea desde el diálogo del rol (SPEC-106 §4.3).
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ code: 'CON-0007', fullName: 'Juan Diego Villasante' }));
    expect(api.linkContact).toHaveBeenCalledWith('CON-0007', 'ORG-0031', null);
    expect(api.createContact).not.toHaveBeenCalled();
  });

  it('vincular pide el rol opcional del vínculo', async () => {
    api.linkContact.mockResolvedValue(null);
    const onChange = jest.fn();
    render(<Harness organization={PSICOLOGIA} value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Vincular a CF Psicología' }));
    fireEvent.change(await screen.findByLabelText('Rol en la organización'), { target: { value: 'Delegado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(api.linkContact).toHaveBeenCalledWith('CON-0007', 'ORG-0031', 'Delegado'));
  });

  it('un contacto que ya pertenece ofrece editar su rol, no crea otro vínculo', async () => {
    api.linkContact.mockRejectedValue({ status: 409, message: 'The contact CON-0007 already belongs to «CF Psicología»' });
    const onChange = jest.fn();
    render(<Harness organization={PSICOLOGIA} value={null} onChange={onChange} />);

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
    render(<Harness organization={PSICOLOGIA} value={null} onChange={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Contacto'), { target: { value: 'juan diego' } });

    try {
      await screen.findByText(/pide a coordinación/i, {}, { timeout: 3000 });
      console.log('DBG FOUND');
    } catch {
      console.log('DBG NOT FOUND');
      screen.debug(undefined, 99999);
    }
    expect(screen.queryByRole('button', { name: /Vincular|Registrar/ })).not.toBeInTheDocument();
  });

  it('sin organización elegida no busca', () => {
    // El provider precarga el catálogo al iniciar la app; el picker sin organización no ofrece resultados.
    render(<Harness organization={null} value={null} onChange={jest.fn()} />);

    expect(screen.getByText(/elige primero la organización/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Contacto')).toBeDisabled();
  });
});
