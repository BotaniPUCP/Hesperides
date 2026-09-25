import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SystemParameter } from '@shared/types';
import { SystemParametersAdminScreen } from '../SystemParametersAdminScreen';
import { ToastProvider } from '@/components/ui';
import { systemParametersApi } from '@/lib/system-parameters-api';

jest.mock('@/lib/system-parameters-api');

const getAll = systemParametersApi.getAll as jest.Mock;

const EDITABLE: SystemParameter = {
  code: 'CAMPUS_TOTAL_HECTARES',
  label: 'Hectáreas del campus',
  value: '41',
  valueType: 'DECIMAL',
  description: 'Extensión total del campus en hectáreas',
  isEditable: true,
};

const RESTRINGIDO: SystemParameter = {
  code: 'SMTP_FROM',
  label: 'Correo remitente',
  value: 'soporte@pucp.edu.pe',
  valueType: 'STRING',
  description: 'Dirección desde la que se envían los correos',
  isEditable: false,
};

function renderizar() {
  return render(
    <ToastProvider>
      <SystemParametersAdminScreen />
    </ToastProvider>,
  );
}

describe('SystemParametersAdminScreen', () => {
  beforeEach(() => {
    getAll.mockResolvedValue([EDITABLE, RESTRINGIDO]);
  });

  it('muestra el valor de un parámetro restringido en un campo bloqueado', async () => {
    renderizar();

    const campo = await screen.findByLabelText('Valor de Correo remitente');

    expect(campo).toHaveValue('soporte@pucp.edu.pe');
    expect(campo).toBeDisabled();
  });

  it('marca solo los restringidos con el aviso en gris', async () => {
    renderizar();

    await screen.findByLabelText('Valor de Correo remitente');

    // Uno de dos: el editable no lleva el aviso.
    expect(screen.getAllByText('Parámetro restringido')).toHaveLength(1);
    expect(screen.getByLabelText('Valor de Hectáreas del campus')).toBeEnabled();
  });

  it('asocia el aviso al campo para los lectores de pantalla', async () => {
    renderizar();

    const campo = await screen.findByLabelText('Valor de Correo remitente');

    expect(campo).toHaveAccessibleDescription('Parámetro restringido');
  });

  it('no envía los restringidos al guardar', async () => {
    const update = systemParametersApi.update as jest.Mock;
    update.mockResolvedValue([{ ...EDITABLE, value: '42' }, RESTRINGIDO]);
    renderizar();

    const hectareas = await screen.findByLabelText('Valor de Hectáreas del campus');
    await userEvent.clear(hectareas);
    await userEvent.type(hectareas, '42');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(update).toHaveBeenCalledWith({ CAMPUS_TOTAL_HECTARES: '42' });
  });
});
