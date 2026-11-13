import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FrequencyActivitySelect } from '../FrequencyActivitySelect';
import type { ActivityOption } from '../activityGroups';

const activities: ActivityOption[] = [
  { id: 1, code: 'PODA_SANITARIA', label: 'Poda sanitaria', parentCode: 'Poda' },
  { id: 2, code: 'PODA_FORMACION', label: 'Poda de formación', parentCode: 'Poda' },
  { id: 3, code: 'RIEGO_MANUAL', label: 'Riego manual', parentCode: 'Riego' },
];

function Harness({ initial = 0, locked = false }: { initial?: number; locked?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <FrequencyActivitySelect activities={activities} value={value} onChange={setValue} locked={locked} />
      <output>{value}</output>
    </>
  );
}

describe('FrequencyActivitySelect', () => {
  it('primero se elige el grupo y luego solo se ofrecen sus actividades', async () => {
    render(<Harness />);
    const activity = screen.getByLabelText('Actividad');
    expect(activity).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Grupo de actividades'), 'Poda');
    expect(activity).toBeEnabled();
    const offered = within(activity).getAllByRole('option').map((o) => o.textContent);
    expect(offered).toEqual(['Selecciona una actividad…', 'Poda sanitaria', 'Poda de formación']);

    await userEvent.selectOptions(activity, '2');
    expect(screen.getByRole('status')).toHaveTextContent('2');
  });

  it('cambiar de grupo descarta la actividad del grupo anterior', async () => {
    render(<Harness initial={1} />);
    expect(screen.getByLabelText('Grupo de actividades')).toHaveValue('Poda');

    await userEvent.selectOptions(screen.getByLabelText('Grupo de actividades'), 'Riego');
    expect(screen.getByRole('status')).toHaveTextContent('0');
  });

  it('al editar no deja cambiar ni el grupo ni la actividad', () => {
    render(<Harness initial={3} locked />);
    expect(screen.getByLabelText('Grupo de actividades')).toBeDisabled();
    expect(screen.getByLabelText('Actividad')).toBeDisabled();
    expect(screen.getByLabelText('Actividad')).toHaveValue('3');
  });
});
