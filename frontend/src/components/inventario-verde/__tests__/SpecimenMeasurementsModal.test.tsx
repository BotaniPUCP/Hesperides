import { render, screen } from '@testing-library/react';
import { catastroApi } from '@/lib/catastro-api';
import { SpecimenMeasurementsModal } from '../SpecimenMeasurementsModal';

jest.mock('@/lib/catastro-api', () => ({
  catastroApi: { measurements: jest.fn() },
}));

const measurementWithNote = {
  id: 1,
  date: '2026-03-01',
  heightM: 7.5,
  trunkHeightM: 6,
  dbhCm: 150,
  crownRadiusM: 3.4,
  banded: true,
  measuredBy: 'Ana Quispe',
  notes: 'Medida con cinta tras la poda',
  origin: 'MEASURED' as const,
  extraValues: [] as { code: string; label: string; unitCode: string; value: number }[],
};

describe('SpecimenMeasurementsModal', () => {
  it('una medición con nota no se presenta como estimada', async () => {
    jest.mocked(catastroApi.measurements).mockResolvedValue([measurementWithNote]);

    render(<SpecimenMeasurementsModal code="EV-000001" speciesName="Palmera real" isOpen onClose={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Ver nota de la medición' })).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Medida con cinta tras la poda');
    expect(screen.queryByText(/estimaci[oó]n/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Promedio de la especie')).not.toBeInTheDocument();
  });

  it('muestra las medidas adicionales de cada fila', async () => {
    jest.mocked(catastroApi.measurements).mockResolvedValue([{
      ...measurementWithNote,
      extraValues: [{ code: 'STEM_COUNT', label: 'Número de tallos', unitCode: 'UNIT', value: 3 }],
    }]);

    render(<SpecimenMeasurementsModal code="EV-000001" speciesName="Palmera real" isOpen onClose={jest.fn()} />);

    expect(await screen.findByText('Número de tallos: 3 und')).toBeInTheDocument();
  });

  it('distingue una fila del promedio de una medida real', async () => {
    jest.mocked(catastroApi.measurements).mockResolvedValue([
      { ...measurementWithNote, id: 2, origin: 'AVERAGE', notes: 'Promedio de la especie aplicado al cerrar INT-000001' },
      measurementWithNote,
    ]);

    render(<SpecimenMeasurementsModal code="EV-000001" speciesName="Palmera real" isOpen onClose={jest.fn()} />);

    expect(await screen.findByText('Promedio de la especie')).toBeInTheDocument();
    expect(screen.getAllByText('Vigente')).toHaveLength(1);
  });
});
