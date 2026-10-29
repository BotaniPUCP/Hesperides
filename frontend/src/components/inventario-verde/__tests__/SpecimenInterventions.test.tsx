import { render, screen } from '@testing-library/react';
import { SpecimenInterventions } from '../SpecimenInterventions';

describe('SpecimenInterventions', () => {
  it('muestra el estado vacío cuando no hay intervenciones registradas', () => {
    render(<SpecimenInterventions code="EV-000001" />);

    expect(screen.getByRole('heading', { name: /Historial de Intervenciones/i })).toBeInTheDocument();
    expect(
      screen.getByText(/No se registran labores de poda, riego o mantenimiento para este ejemplar/i),
    ).toBeInTheDocument();
  });

  it('muestra el listado de labores cuando se proporcionan intervenciones', () => {
    const items = [
      {
        id: 1,
        date: '2026-10-15',
        className: 'PODA',
        typeName: 'Poda de formación',
        supervisorName: 'Carlos Quispe',
        executedQuantity: 1,
        unit: 'árbol',
        notes: 'Poda de ramas bajas que rozaban el sendero',
        status: 'EJECUTADA',
      },
    ];

    render(<SpecimenInterventions code="EV-000001" interventions={items} />);

    expect(screen.getByText('Poda de formación')).toBeInTheDocument();
    expect(screen.getByText('PODA')).toBeInTheDocument();
    expect(screen.getByText('Carlos Quispe')).toBeInTheDocument();
    expect(screen.getByText('Poda de ramas bajas que rozaban el sendero')).toBeInTheDocument();
    expect(screen.getByText('1 registro')).toBeInTheDocument();
  });
});
