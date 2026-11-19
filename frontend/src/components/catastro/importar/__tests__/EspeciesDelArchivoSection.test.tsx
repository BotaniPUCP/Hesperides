import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EspeciesDelArchivoSection } from '../EspeciesDelArchivoSection';
import type { SpeciesImportBinding } from '@shared/types';

describe('EspeciesDelArchivoSection - Refactor UI/UX Unificación de Especies', () => {
  const mockOnVincular = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const BINDING_ROYS: SpeciesImportBinding = {
    sourceKey: 'roystonea regia',
    sourceName: 'Roystonea regia',
    rows: 2,
    speciesSlug: 'roystonea-regia',
    scientificName: 'Roystonea regia',
    active: true,
    resolution: 'SCIENTIFIC_NAME',
  };

  const BINDING_DELONIX: SpeciesImportBinding = {
    sourceKey: 'delonix regia',
    sourceName: 'Delonix regia',
    rows: 2,
    speciesSlug: 'butia-capitata',
    scientificName: 'Butia capitata',
    active: true,
    resolution: 'USER_SELECTED',
  };

  const UNKNOWN_WASH = {
    sourceKey: 'washingtonia robusta',
    name: 'Washingtonia robusta',
    rows: 2,
  };

  const UNKNOWN_SCHINUS = {
    sourceKey: 'schinus molle',
    name: 'Schinus molle',
    rows: 2,
  };

  it('1. Unifica las secciones mostrando total e indicadores de estado', () => {
    render(
      <EspeciesDelArchivoSection
        bindings={[BINDING_ROYS, BINDING_DELONIX]}
        unknownSpecies={[UNKNOWN_WASH, UNKNOWN_SCHINUS]}
        onVincular={mockOnVincular}
      />
    );

    expect(screen.getByRole('heading', { name: 'Especies del archivo' })).toBeInTheDocument();
    expect(screen.getByTestId('total-especies-badge')).toHaveTextContent('4');
    expect(screen.getByText('2 asociadas')).toBeInTheDocument();
    expect(screen.getByText('2 pendientes')).toBeInTheDocument();
  });

  it('2. Todas las especies comparten la misma estructura visual (primera fila y segunda fila)', () => {
    render(
      <EspeciesDelArchivoSection
        bindings={[BINDING_ROYS]}
        unknownSpecies={[UNKNOWN_WASH]}
        onVincular={mockOnVincular}
      />
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    // Especie pendiente (Washingtonia robusta)
    const washItem = items[0];
    expect(within(washItem).getAllByText('Washingtonia robusta')).toHaveLength(2);
    expect(within(washItem).getByText('2 filas del archivo')).toBeInTheDocument();
    expect(within(washItem).getByText('Pendiente')).toBeInTheDocument();
    expect(within(washItem).getByText('Sin asociar')).toBeInTheDocument();
    expect(within(washItem).getByRole('button', { name: 'Seleccionar especie existente' })).toBeInTheDocument();

    // Especie asociada (Roystonea regia) donde coincide origen y catálogo (1 en fila 1 + 2 en fila 2)
    const roysItem = items[1];
    expect(within(roysItem).getAllByText('Roystonea regia')).toHaveLength(3);
    expect(within(roysItem).getByText('2 filas del archivo')).toBeInTheDocument();
    expect(within(roysItem).getByText('En catálogo de especies')).toBeInTheDocument();
    expect(within(roysItem).getByRole('button', { name: 'Cambiar especie' })).toBeInTheDocument();
    expect(within(roysItem).getByRole('button', { name: 'Quitar asociación' })).toBeInTheDocument();
  });

  it('3. Ordenamiento: pendientes de asociación aparecen primero y asociadas después', () => {
    render(
      <EspeciesDelArchivoSection
        bindings={[BINDING_DELONIX, BINDING_ROYS]}
        unknownSpecies={[UNKNOWN_WASH, UNKNOWN_SCHINUS]}
        onVincular={mockOnVincular}
      />
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);

    // Las dos primeras deben ser las pendientes (ordenadas alfabéticamente: Schinus molle, luego Washingtonia robusta)
    expect(within(items[0]).getByText('Pendiente')).toBeInTheDocument();
    expect(within(items[0]).getAllByText('Schinus molle').length).toBeGreaterThanOrEqual(1);

    expect(within(items[1]).getByText('Pendiente')).toBeInTheDocument();
    expect(within(items[1]).getAllByText('Washingtonia robusta').length).toBeGreaterThanOrEqual(1);

    // Las siguientes son las asociadas (Delonix regia, luego Roystonea regia)
    expect(within(items[2]).getByText('En catálogo de especies')).toBeInTheDocument();
    expect(within(items[2]).getAllByText('Delonix regia').length).toBeGreaterThanOrEqual(1);

    expect(within(items[3]).getByText('En catálogo de especies')).toBeInTheDocument();
    expect(within(items[3]).getAllByText('Roystonea regia').length).toBeGreaterThanOrEqual(1);
  });

  it('4. Permite quitar una asociación llamando a onVincular con null', async () => {
    render(
      <EspeciesDelArchivoSection
        bindings={[BINDING_ROYS]}
        unknownSpecies={[]}
        onVincular={mockOnVincular}
      />
    );

    const botonQuitar = screen.getByRole('button', { name: 'Quitar asociación' });
    await userEvent.click(botonQuitar);

    expect(mockOnVincular).toHaveBeenCalledWith('roystonea regia', null);
  });

  it('5. Paginación unificada: oculta controles con 5 o menos especies', () => {
    render(
      <EspeciesDelArchivoSection
        bindings={[BINDING_ROYS, BINDING_DELONIX]}
        unknownSpecies={[UNKNOWN_WASH, UNKNOWN_SCHINUS]}
        onVincular={mockOnVincular}
      />
    );

    expect(screen.getByText('Mostrando 1–4 de 4 especies')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
  });

  it('6. Paginación unificada: muestra controles y permite navegar con 6 o más especies', async () => {
    const muchasPendientes = Array.from({ length: 7 }, (_, i) => ({
      sourceKey: `especie-test-${i + 1}`,
      name: `Especie Test ${i + 1}`,
      rows: 1,
    }));

    render(
      <EspeciesDelArchivoSection
        bindings={[]}
        unknownSpecies={muchasPendientes}
        onVincular={mockOnVincular}
      />
    );

    // Total 7 especies: Página 1 debe mostrar 5 especies
    expect(screen.getByText('Mostrando 1–5 de 7 especies')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);

    const btnAnterior = screen.getByRole('button', { name: 'Anterior' });
    const btnSiguiente = screen.getByRole('button', { name: 'Siguiente' });

    expect(btnAnterior).toBeDisabled();
    expect(btnSiguiente).toBeEnabled();

    // Avanzar a la página 2
    await userEvent.click(btnSiguiente);

    expect(screen.getByText('Mostrando 6–7 de 7 especies')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(btnAnterior).toBeEnabled();
    expect(btnSiguiente).toBeDisabled();

    // Retroceder a la página 1
    await userEvent.click(btnAnterior);
    expect(screen.getByText('Mostrando 1–5 de 7 especies')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('7. Paginación unificada: con más de 10 especies calcula páginas y evita páginas vacías', async () => {
    const doceEspecies = Array.from({ length: 12 }, (_, i) => ({
      sourceKey: `especie-test-${i + 1}`,
      name: `Especie Test ${String(i + 1).padStart(2, '0')}`,
      rows: 1,
    }));

    const { rerender } = render(
      <EspeciesDelArchivoSection
        bindings={[]}
        unknownSpecies={doceEspecies}
        onVincular={mockOnVincular}
      />
    );

    // Página 1 de 3 (12 total)
    expect(screen.getByText('Mostrando 1–5 de 12 especies')).toBeInTheDocument();
    const btnSiguiente = screen.getByRole('button', { name: 'Siguiente' });
    await userEvent.click(btnSiguiente); // Va a página 2
    expect(screen.getByText('Mostrando 6–10 de 12 especies')).toBeInTheDocument();
    await userEvent.click(btnSiguiente); // Va a página 3
    expect(screen.getByText('Mostrando 11–12 de 12 especies')).toBeInTheDocument();

    // Si la lista disminuye a 5 elementos mientras estamos en la página 3, debe ajustar a página 1 y evitar página vacía
    rerender(
      <EspeciesDelArchivoSection
        bindings={[]}
        unknownSpecies={doceEspecies.slice(0, 5)}
        onVincular={mockOnVincular}
      />
    );

    expect(screen.getByText('Mostrando 1–5 de 5 especies')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('8. No renderiza nada si no hay especies en el archivo', () => {
    const { container } = render(
      <EspeciesDelArchivoSection
        bindings={[]}
        unknownSpecies={[]}
        onVincular={mockOnVincular}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
