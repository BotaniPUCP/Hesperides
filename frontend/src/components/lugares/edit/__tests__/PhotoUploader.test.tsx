import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayLocal } from '@/lib/local-date';
import { placesApi } from '@/lib/places-api';
import { PhotoUploader } from '../PhotoUploader';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/hooks/useCatalog', () => ({ useCatalog: () => ({ items: [] }) }));
jest.mock('@/lib/places-api', () => ({ placesApi: { uploadPhoto: jest.fn() } }));

const LABEL = 'Subir fotos';
const foto = new File(['x'], 'foto.png', { type: 'image/png' });

async function abrir(onDone: () => void = jest.fn()) {
  render(<PhotoUploader placeCode="L-1" target={{}} label={LABEL} onDone={onDone} />);
  await userEvent.click(screen.getByRole('button', { name: LABEL }));
}
const campoFecha = () => screen.getByLabelText('Fecha de la foto');
const subir = () => fireEvent.change(screen.getByLabelText(`Archivos para ${LABEL}`), { target: { files: [foto] } });

describe('PhotoUploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(placesApi.uploadPhoto).mockResolvedValue(undefined as never);
  });

  it('abre con hoy como fecha de la foto', async () => {
    await abrir();

    expect(campoFecha()).toHaveValue(todayLocal());
  });

  it('envía la fecha propuesta si no se cambia', async () => {
    const onDone = jest.fn();
    await abrir(onDone);

    subir();

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(placesApi.uploadPhoto).toHaveBeenCalledWith('L-1', foto, expect.objectContaining({ takenOn: todayLocal() }));
  });

  it('envía la fecha que la persona eligió', async () => {
    const onDone = jest.fn();
    await abrir(onDone);

    fireEvent.change(campoFecha(), { target: { value: '2019-05-20' } });
    subir();

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(placesApi.uploadPhoto).toHaveBeenCalledWith('L-1', foto, expect.objectContaining({ takenOn: '2019-05-20' }));
  });

  it('cancelar sin tocar nada no pide confirmación', async () => {
    await abrir();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByLabelText('Fecha de la foto')).not.toBeInTheDocument();
  });

  it('cancelar con otra fecha sí pide confirmación', async () => {
    await abrir();
    fireEvent.change(campoFecha(), { target: { value: '2019-05-20' } });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(campoFecha()).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('al volver a abrir tras una subida propone hoy otra vez', async () => {
    const onDone = jest.fn();
    await abrir(onDone);
    fireEvent.change(campoFecha(), { target: { value: '2019-05-20' } });
    subir();
    await waitFor(() => expect(onDone).toHaveBeenCalled());

    await userEvent.click(await screen.findByRole('button', { name: LABEL }));

    expect(campoFecha()).toHaveValue(todayLocal());
  });
});
