import { render, screen } from '@testing-library/react';
import { ReservationDetailScreen } from '../ReservationDetailScreen';
import { reservationFixture } from '../__fixtures__/reservation';

const mockSetMap = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('@/hooks/useReservations', () => ({
  useCanMaintainReservations: () => false,
  useCanRecordUsage: () => false,
  useReservation: () => ({ reservation: mockReservation, loading: false, errorMessage: null, notFound: false, reload: jest.fn() }),
  useReservationCheck: () => ({ warnings: [], errorMessage: null }),
}));
jest.mock('../ReservationDetails', () => ({ ReservationDetails: () => <div data-testid="detalle" /> }));
// El mapa 3D no corre en jsdom: interesa qué se le pide iluminar.
jest.mock('@/components/planning/SetMap', () => ({
  SetMap: (props: { zoneCodes: string[]; specimenCodes: string[] }) => { mockSetMap(props); return <div data-testid="mapa" />; },
}));

let mockReservation = reservationFixture();

describe('ReservationDetailScreen: el mapa de la ficha', () => {
  it('ilumina las secciones del jardín reservado, sin ejemplares', () => {
    mockReservation = reservationFixture({ place: { id: 25, code: 'LUG-0025', name: 'Jardín Rosales', sectionCodes: ['AV-0151', 'AV-0152'] } });
    render(<ReservationDetailScreen code="RES-0001" />);

    expect(screen.getByTestId('mapa')).toBeInTheDocument();
    expect(mockSetMap).toHaveBeenLastCalledWith(expect.objectContaining({ zoneCodes: ['AV-0151', 'AV-0152'], specimenCodes: [] }));
  });
});
