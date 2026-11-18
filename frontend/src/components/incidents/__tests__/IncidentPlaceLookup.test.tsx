import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationFields } from '../LocationFields';
import { placesApi } from '@/lib/places-api';

jest.mock('@/lib/places-api', () => ({ placesApi: { list: jest.fn() } }));

const places = [
  { code: 'P-01', name: 'Biblioteca Central', searchKey: 'p-01 biblioteca central bc' },
  { code: 'P-02', name: 'Pabellón Z', searchKey: 'p-02 pabellon z' },
] as Awaited<ReturnType<typeof placesApi.list>>;

function Form() {
  const [location, setLocation] = useState({ reference: '', latitude: '-12.07', longitude: '-77.08' });
  return <LocationFields value={location} onChange={setLocation} />;
}

it('looks up known names while typing, loading the catalogue once, and never invents coordinates', async () => {
  jest.mocked(placesApi.list).mockResolvedValue(places);
  render(<Form />);
  expect(placesApi.list).not.toHaveBeenCalled();

  await userEvent.click(screen.getByText('Buscar un lugar conocido (opcional)'));
  await userEvent.type(screen.getByLabelText('Nombre o alias del lugar'), 'biblioteca');
  await userEvent.click(await screen.findByRole('button', { name: 'Biblioteca Central' }));

  await waitFor(() => expect(screen.getByLabelText('Referencia del lugar (opcional)')).toHaveValue('Biblioteca Central'));
  expect(screen.getByText('Punto seleccionado: -12.07, -77.08')).toBeInTheDocument();
  expect(placesApi.list).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Pabellón Z' })).not.toBeInTheDocument();
});

it('finds a place by alias without accents', async () => {
  jest.mocked(placesApi.list).mockResolvedValue(places);
  render(<Form />);

  await userEvent.click(screen.getByText('Buscar un lugar conocido (opcional)'));
  await userEvent.type(screen.getByLabelText('Nombre o alias del lugar'), 'PABELLON');

  expect(await screen.findByRole('button', { name: 'Pabellón Z' })).toBeInTheDocument();
});
