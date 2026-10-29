import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentCaptureForm } from '../IncidentCaptureForm';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';

jest.mock('@/lib/incidents-api', () => ({
  incidentsApi: { create: jest.fn(), upload: jest.fn() },
  newClientReference: jest.fn(() => '7ac93225-2e12-4a51-a700-222222222222'),
}));
const create = jest.mocked(incidentsApi.create);
const upload = jest.mocked(incidentsApi.upload);

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  create.mockResolvedValue({ incident: { id: 7 } } as Awaited<ReturnType<typeof incidentsApi.create>>);
});

it('sends a short sentence without title, photo, location or classification', async () => {
  const done = jest.fn();
  render(<IncidentCaptureForm sender="Óscar" onDone={done} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), 'Rama caída en puerta principal');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(create).toHaveBeenCalledWith({ description: 'Rama caída en puerta principal', locationReference: null, latitude: null, longitude: null }, expect.any(String));
  expect(upload).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledWith(7);
});

it('retains the text and idempotency key after an uncertain network failure', async () => {
  create.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.'));
  render(<IncidentCaptureForm sender="Óscar" onDone={jest.fn()} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), 'Rama');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByLabelText(/¿Qué pasó?/)).toHaveValue('Rama');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
});

it('does not recreate the incident when a photo fails and is retried', async () => {
  const done = jest.fn();
  upload.mockRejectedValueOnce(new ApiError(500, 'Storage unavailable')).mockResolvedValueOnce({ id: 1 } as never);
  render(<IncidentCaptureForm sender="Óscar" onDone={done} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), 'Rama');
  fireEvent.change(screen.getByLabelText('Añadir fotos'), { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(await screen.findByText(/Tu texto ya fue recibido/)).toBeInTheDocument();
  expect(done).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar fotos pendientes' })).toBeEnabled());
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar fotos pendientes' }));
  expect(create).toHaveBeenCalledTimes(1);
  expect(upload.mock.calls[1]).toEqual(upload.mock.calls[0]);
  expect(done).toHaveBeenCalledWith(7);
});

it('only rejects empty text and never requests geolocation automatically', async () => {
  const locate = jest.fn();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: locate } });
  render(<IncidentCaptureForm sender="Óscar" onDone={jest.fn()} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), '   ');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(create).not.toHaveBeenCalled();
  expect(locate).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Escribe brevemente');
  expect(screen.getByLabelText(/¿Qué pasó?/)).toHaveAttribute('aria-invalid', 'true');
});
