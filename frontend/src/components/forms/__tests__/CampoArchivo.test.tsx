import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampoArchivo } from '../CampoArchivo';
import { LIMITES } from '@/lib/upload-limits';

const archivo = (bytes: number) => {
  const f = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
};

function renderCampo(onElegir = jest.fn()) {
  render(<CampoArchivo id="f" etiqueta="Foto" acepta="image/*" limite={LIMITES.foto} archivo={null} onElegir={onElegir} />);
  return onElegir;
}

describe('CampoArchivo', () => {
  it('avisa el máximo antes de elegir', () => {
    renderCampo();

    expect(screen.getByText(/Máximo 25 MB/)).toBeInTheDocument();
  });

  it('rechaza un archivo demasiado grande sin entregarlo', async () => {
    const onElegir = renderCampo();

    await userEvent.upload(screen.getByLabelText('Foto'), archivo(30 * 1024 * 1024));

    expect(screen.getByRole('alert')).toHaveTextContent('El archivo pesa 30 MB; el máximo es 25 MB.');
    expect(onElegir).toHaveBeenCalledWith(null);
    expect(onElegir).not.toHaveBeenCalledWith(expect.any(File));
  });

  it('entrega un archivo que cabe', async () => {
    const onElegir = renderCampo();

    await userEvent.upload(screen.getByLabelText('Foto'), archivo(2 * 1024 * 1024));

    expect(onElegir).toHaveBeenCalledWith(expect.any(File));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
