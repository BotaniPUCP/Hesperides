import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationFields } from '../LocationFields';
import { placesApi } from '@/lib/places-api';

jest.mock('@/lib/places-api', () => ({ placesApi: { list: jest.fn() } }));

it('looks up known names only on request and never invents coordinates', async () => {
  jest.mocked(placesApi.list).mockResolvedValue([{ code: 'P-01', name: 'Biblioteca Central' }] as Awaited<ReturnType<typeof placesApi.list>>);
  function Form() {
    const [location, setLocation] = useState({ reference: '', latitude: '-12.07', longitude: '-77.08' });
    return <LocationFields value={location} onChange={setLocation} />;
  }
  render(<Form />);
  expect(placesApi.list).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText('Buscar un lugar conocido (opcional)'));
  await userEvent.type(screen.getByLabelText('Nombre o alias del lugar'), 'biblioteca');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar lugar' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Biblioteca Central' }));
  await waitFor(() => expect(screen.getByLabelText('Referencia del lugar (opcional)')).toHaveValue('Biblioteca Central'));
  expect(screen.getByText('Punto seleccionado: -12.07, -77.08')).toBeInTheDocument();
});
