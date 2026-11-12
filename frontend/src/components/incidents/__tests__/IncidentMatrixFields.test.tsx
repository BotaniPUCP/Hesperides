import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentMatrixFields, matrixReview } from '../IncidentMatrixFields';
import { emptyMatrix, incidentOptions } from '../__fixtures__/incidents';

it('filters subprocesses by process and clears a previous dependent selection', async () => {
  const options = { ...incidentOptions.matrix,
    processes: [{ id: 40, code: 'GSG-01', label: 'Planificación', parentCode: null, description: null },
      { id: 41, code: 'GSG-02', label: 'Operaciones', parentCode: null, description: null }],
    subprocesses: [{ id: 42, code: 'GREEN_OPERATIONS', label: 'Operación de áreas verdes', parentCode: 'GSG-02', description: null }],
  };
  function Form() {
    const [value, setValue] = useState(matrixReview(emptyMatrix));
    return <IncidentMatrixFields value={value} original={emptyMatrix} options={options} disabled={false} onChange={setValue} />;
  }
  render(<Form />);
  expect(screen.queryByRole('option', { name: 'Operación de áreas verdes' })).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Proceso N2'), 'GSG-02');
  await userEvent.selectOptions(screen.getByLabelText('Subproceso'), 'GREEN_OPERATIONS');
  await userEvent.selectOptions(screen.getByLabelText('Proceso N2'), 'GSG-01');
  expect(screen.getByLabelText('Subproceso')).toHaveValue('');
});
