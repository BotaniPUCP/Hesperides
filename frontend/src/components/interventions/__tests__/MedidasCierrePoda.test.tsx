import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { p01Detail } from '@/components/inventario-verde/__fixtures__/inventario';
import type { DecisionPoda } from '../cierrePoda';
import { MedidasCierrePoda } from '../MedidasCierrePoda';

jest.mock('@/lib/inventario-verde-api', () => ({ inventarioVerdeApi: { specimen: jest.fn() } }));

const HOY = '2026-11-07';
const specimen = jest.mocked(inventarioVerdeApi.specimen);

function Conjunto({ codigos, error }: { codigos: string[]; error?: string | null }) {
  const [decisiones, setDecisiones] = useState<Record<string, DecisionPoda>>({});
  return (
    <>
      <MedidasCierrePoda codigos={codigos} decisiones={decisiones} onCambiar={setDecisiones} hoy={HOY} errores={error ? { [codigos[0]]: error } : {}} />
      <output data-testid="estado">{JSON.stringify(decisiones)}</output>
    </>
  );
}

afterEach(() => jest.resetAllMocks());

describe('MedidasCierrePoda', () => {
  it('muestra por ejemplar solo las opciones que le aplican, con la que no escribe nada elegida', async () => {
    specimen.mockImplementation(async (code) => code === 'EV-1'
      ? { ...p01Detail, code, speciesCritical: true, measurementStatus: 'MEASURED' }
      : { ...p01Detail, code, speciesCritical: false, measurementStatus: 'REFERENCE' });

    render(<Conjunto codigos={['EV-1', 'EV-2']} />);

    const critico = within(await screen.findByRole('group', { name: /EV-1/ }));
    expect(critico.getByRole('radio', { name: 'No cambiar' })).toBeChecked();
    expect(critico.queryByRole('radio', { name: /promedio/i })).not.toBeInTheDocument();

    const noCritico = within(screen.getByRole('group', { name: /EV-2/ }));
    expect(noCritico.getByRole('radio', { name: 'Dejar en promedio' })).toBeChecked();
  });

  it('elegir medidas reales despliega solo los campos que aplican a la especie', async () => {
    specimen.mockResolvedValue({
      ...p01Detail, code: 'EV-1', species: { ...p01Detail.species, usesTrunkHeight: false, usesDbh: true },
    });

    render(<Conjunto codigos={['EV-1']} />);

    const grupo = within(await screen.findByRole('group', { name: /EV-1/ }));
    expect(grupo.queryByLabelText(/Altura/)).not.toBeInTheDocument();

    fireEvent.click(grupo.getByRole('radio', { name: 'Medidas reales' }));

    expect(grupo.getByLabelText(/Altura/)).toBeInTheDocument();
    expect(grupo.getByLabelText(/DAP/)).toBeInTheDocument();
    expect(grupo.queryByLabelText(/Fuste/)).not.toBeInTheDocument();
    expect(grupo.getByLabelText(/Fecha de la medición/)).toHaveValue(HOY);

    fireEvent.change(grupo.getByLabelText(/Altura/), { target: { value: '2.5' } });
    expect(screen.getByTestId('estado')).toHaveTextContent('"opcion":"MEASURED"');
    expect(screen.getByTestId('estado')).toHaveTextContent('"altura":"2.5"');
  });

  it('muestra el error de un ejemplar', async () => {
    specimen.mockResolvedValue({ ...p01Detail, code: 'EV-1' });

    render(<Conjunto codigos={['EV-1']} error="Indica al menos una medida." />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Indica al menos una medida.');
  });

  it('si no carga los ejemplares avisa que el cierre no cambiará medidas', async () => {
    specimen.mockRejectedValue(new Error('sin red'));

    render(<Conjunto codigos={['EV-1']} />);

    expect(await screen.findByText(/se cerrará sin cambiar sus medidas/)).toBeInTheDocument();
  });
});
