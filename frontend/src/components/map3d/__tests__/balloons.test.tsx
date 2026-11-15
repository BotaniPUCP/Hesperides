import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { Balloon, BalloonsResponse } from '@shared/types';
import { BalloonCard } from '../balloons/BalloonCard';
import { BalloonLegend } from '../balloons/BalloonLegend';
import { REFRESH_MS, useBalloons } from '../balloons/useBalloons';
import { balloonsApi } from '@/lib/balloons-api';

jest.mock('@/lib/balloons-api', () => ({ balloonsApi: { list: jest.fn() } }));
const list = balloonsApi.list as jest.Mock;

const balloon = (over: Partial<Balloon> = {}): Balloon => ({
  id: 'INCIDENT:4', kind: 'INCIDENT', variant: 'HIGH', attention: true, latitude: -12, longitude: -77, sectorId: 1,
  memberCount: 1,
  card: { title: 'Rama caída sobre la vereda', status: 'En atención', lines: [{ label: 'Abierta', value: 'Hace 3 días' }],
    progress: null, photoUrl: null, href: '/incidencias/4' },
  ...over,
});
const response = (balloons: Balloon[], unavailableKinds: BalloonsResponse['unavailableKinds'] = []): BalloonsResponse =>
  ({ generatedAt: '2026-11-15T10:00:00-05:00', balloons, unavailableKinds, truncated: false });

describe('useBalloons (SPEC-113 §5.6)', () => {
  beforeEach(() => { jest.useFakeTimers(); list.mockReset(); });
  afterEach(() => jest.useRealTimers());

  it('pide los globos al encender y los vuelve a pedir cada minuto', async () => {
    list.mockResolvedValue(response([balloon()]));
    const { result } = renderHook(() => useBalloons(true));

    await waitFor(() => expect(result.current.balloons).toHaveLength(1));
    await act(async () => { jest.advanceTimersByTime(REFRESH_MS); });
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('apagado no pide nada y no muestra globos (CA-12)', async () => {
    const { result } = renderHook(() => useBalloons(false));
    await act(async () => { jest.advanceTimersByTime(REFRESH_MS * 2); });

    expect(list).not.toHaveBeenCalled();
    expect(result.current.balloons).toEqual([]);
  });

  it('con la pestaña oculta no refresca', async () => {
    list.mockResolvedValue(response([]));
    renderHook(() => useBalloons(true));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });

    await act(async () => { jest.advanceTimersByTime(REFRESH_MS * 2); });

    expect(list).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });
});

describe('BalloonCard (SPEC-113 §7.2)', () => {
  it('muestra tipo, título, estado, líneas y el enlace al detalle', () => {
    render(<BalloonCard balloon={balloon()} gone={false} onClose={jest.fn()} />);

    expect(screen.getByText('Incidencia alta')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rama caída sobre la vereda' })).toBeInTheDocument();
    expect(screen.getByText('En atención')).toBeInTheDocument();
    expect(screen.getByText('Hace 3 días')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver detalle/ })).toHaveAttribute('href', '/incidencias/4');
  });

  it('con avance muestra «2 de 4» y su barra', () => {
    render(<BalloonCard balloon={balloon({ kind: 'INTERVENTION', variant: null, attention: false,
      card: { ...balloon().card, progress: { done: 2, total: 4 } } })} gone={false} onClose={jest.fn()} />);

    expect(screen.getByRole('progressbar', { name: '2 de 4' })).toHaveAttribute('aria-valuenow', '2');
  });

  it('si el globo terminó lo avisa en vez de desaparecer bajo el dedo', () => {
    const onClose = jest.fn();
    render(<BalloonCard balloon={balloon()} gone onClose={onClose} />);

    expect(screen.getByRole('status')).toHaveTextContent('Esto ya terminó');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('BalloonLegend (SPEC-113 §7.3)', () => {
  it('cuenta los globos de cada tipo con fuente y avisa la que no respondió', () => {
    const onToggle = jest.fn();
    render(<BalloonLegend on balloons={[balloon(), balloon({ id: 'INCIDENT:5', variant: 'LOW' })]}
      unavailableKinds={['RESERVATION']} onToggle={onToggle} />);

    expect(screen.getByText('Incidencia abierta').closest('li')).toHaveTextContent('2');
    expect(screen.getByText('Riego en curso o de hoy').closest('li')).toHaveTextContent('0');
    expect(screen.queryByText('Evento bloqueante')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Reserva en curso');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Globos' }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
