import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecimenAssessments } from '../SpecimenAssessments';
import { catastroApi } from '@/lib/catastro-api';
import { useAuth } from '@/hooks/useAuth';
import type { Assessment } from '@shared/types';

jest.mock('@/lib/catastro-api', () => ({
  catastroApi: {
    assessments: jest.fn(),
    assess: jest.fn(),
  },
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

const mockCatastroApi = catastroApi as jest.Mocked<typeof catastroApi>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const EJEMPLO_HISTORIAL: Assessment[] = [
  {
    id: 101,
    date: '2026-10-15',
    assessedBy: 'Carlos Agrónomo',
    hasDisease: false,
    hasPests: false,
    hasMechanicalDamage: false,
    isLeaning: false,
    hasDeadBranches: false,
    hasCavitiesOrRot: false,
    hasExposedRoots: false,
    interferesWithInfrastructure: false,
    recommendedManagement: 'Sin intervención',
    observation: null,
  },
  {
    id: 100,
    date: '2026-05-10',
    assessedBy: 'Ana Supervisora',
    hasDisease: true,
    hasPests: true,
    hasMechanicalDamage: false,
    isLeaning: false,
    hasDeadBranches: true,
    hasCavitiesOrRot: false,
    hasExposedRoots: false,
    interferesWithInfrastructure: false,
    recommendedManagement: 'Poda sanitaria y tratamiento',
    observation: 'Queresas en ramas secundarias',
  },
];

describe('SpecimenAssessments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCatastroApi.assessments.mockResolvedValue(EJEMPLO_HISTORIAL);
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(),
    });
  });

  it('muestra las evaluaciones con vigente e histórico', async () => {
    render(<SpecimenAssessments code="EV-000001" />);

    expect(await screen.findByText('Evaluaciones Fitosanitarias e Inspecciones')).toBeInTheDocument();
    expect(screen.getByText('vigente')).toBeInTheDocument();
    expect(screen.getByText('histórico')).toBeInTheDocument();
    expect(screen.getByText(/Carlos Agrónomo/)).toBeInTheDocument();
    expect(screen.getByText(/Ana Supervisora/)).toBeInTheDocument();
  });

  it('no muestra botón "+ Nueva evaluación" para usuario anónimo o sin rol', async () => {
    render(<SpecimenAssessments code="EV-000001" />);

    await screen.findByText('Evaluaciones Fitosanitarias e Inspecciones');
    expect(screen.queryByRole('button', { name: /\+ Nueva evaluación/i })).not.toBeInTheDocument();
  });

  it('muestra botón "+ Nueva evaluación" para rol SUPERVISOR y abre modal', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'supervisor@pucp.edu.pe',
        firstName: 'Supervisor',
        lastName: 'Campo',
        fullName: 'Supervisor Campo',
        role: { id: 3, code: 'SUPERVISOR', label: 'Supervisor' },
        isActive: true,
        lastLogin: null,
        mustChangePassword: false,
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(),
    });

    render(<SpecimenAssessments code="EV-000001" />);

    const newBtn = await screen.findByRole('button', { name: /Nueva evaluación/i });
    expect(newBtn).toBeInTheDocument();

    await user.click(newBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Registrar evaluación fitosanitaria e inspección/i)).toBeInTheDocument();
    expect(screen.getByText('EV-000001')).toBeInTheDocument();
  });

  it('permite registrar una nueva evaluación con confirmación previa y actualiza la lista', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'coordinador@pucp.edu.pe',
        firstName: 'Coordinador',
        lastName: 'Catastro',
        fullName: 'Coordinador Catastro',
        role: { id: 2, code: 'COORDINADOR', label: 'Coordinador' },
        isActive: true,
        lastLogin: null,
        mustChangePassword: false,
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(),
    });

    const NUEVA_LISTA: Assessment[] = [
      {
        id: 102,
        date: '2026-11-04',
        assessedBy: 'Coordinador Catastro',
        hasDisease: false,
        hasPests: false,
        hasMechanicalDamage: false,
        isLeaning: false,
        hasDeadBranches: false,
        hasCavitiesOrRot: false,
        hasExposedRoots: false,
        interferesWithInfrastructure: false,
        recommendedManagement: 'Sin intervención',
        observation: 'Evaluación post-lluvia sin anomalías',
      },
      ...EJEMPLO_HISTORIAL,
    ];

    mockCatastroApi.assess.mockResolvedValue(NUEVA_LISTA);

    render(<SpecimenAssessments code="EV-000001" />);

    const newBtn = await screen.findByRole('button', { name: /Nueva evaluación/i });
    await user.click(newBtn);

    const submitBtn = screen.getByRole('button', { name: /Guardar evaluación/i });
    await user.click(submitBtn);

    // Debe abrirse el diálogo de confirmación antes de llamar a la API
    const confirmTitle = await screen.findByText(/Confirmar evaluación fitosanitaria/i);
    expect(confirmTitle).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar y registrar/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockCatastroApi.assess).toHaveBeenCalledWith(
        'EV-000001',
        expect.objectContaining({
          date: expect.any(String),
        })
      );
    });

    // Se cerró el modal y se actualizó la lista mostrando la nueva observación
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/Evaluación post-lluvia sin anomalías/)).toBeInTheDocument();
  });
});
