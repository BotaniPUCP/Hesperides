import { render, screen } from '@testing-library/react';
import { ImagePlaceholder } from '../ImagePlaceholder';

describe('ImagePlaceholder', () => {
  it('renderiza con label predeterminado y accesibilidad adecuada', () => {
    render(<ImagePlaceholder type="TREE" />);
    const placeholder = screen.getByRole('img', { name: 'Fotografía no disponible' });
    expect(placeholder).toBeInTheDocument();
    expect(screen.getByText('Fotografía no disponible')).toBeInTheDocument();
  });

  it('permite personalizar el label y el tamaño', () => {
    render(<ImagePlaceholder type="PALM" size="lg" label="Sin foto para Palmera" />);
    expect(screen.getByRole('img', { name: 'Sin foto para Palmera' })).toBeInTheDocument();
    expect(screen.getByText('Sin foto para Palmera')).toBeInTheDocument();
  });
});
