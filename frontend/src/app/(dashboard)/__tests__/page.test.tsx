import { render, screen } from '@testing-library/react';
import HomePage from '../page';

let mockAuth: {
  user: { email: string; fullName: string; role: { code: string; label: string } } | null;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/components/homeCalendar/HomeCalendar', () => ({
  HomeCalendar: () => <div data-testid="home-calendar" />,
}));

jest.mock('@/components/planning/PlanningAlerts', () => ({
  PlanningAlerts: () => <div data-testid="planning-alerts" />,
}));

describe('HomePage', () => {
  beforeEach(() => {
    mockAuth = {
      user: {
        email: 'admin@pucp.edu.pe',
        fullName: 'Administrador Hesperides',
        role: { code: 'ADMIN', label: 'Administrador' },
      },
    };
  });

  it('saluda a la persona con sesion iniciada', () => {
    render(<HomePage />);

    expect(screen.getByText(/Administrador Hesperides/)).toBeInTheDocument();
    expect(screen.getByText('admin@pucp.edu.pe')).toBeInTheDocument();
  });

  it('muestra primero el calendario y luego los avisos de planificación (SPEC-121)', () => {
    render(<HomePage />);

    const calendar = screen.getByTestId('home-calendar'), alerts = screen.getByTestId('planning-alerts');
    expect(calendar.compareDocumentPosition(alerts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('ya no lista enlaces a los módulos: la navegación vive en el sidebar', () => {
    // Dos listas de navegación divergen: la del sidebar es la única fuente.
    render(<HomePage />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
