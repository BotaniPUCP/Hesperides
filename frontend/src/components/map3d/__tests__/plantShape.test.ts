import type { VegetationProperties } from '@shared/types';
import { plantShape } from '../plantShape';

const plant = (extra: Partial<VegetationProperties> = {}): VegetationProperties => ({
  code: 'EV-000400', speciesSlug: 'delonix-regia', commonName: 'Ponciana', scientificName: 'Delonix regia',
  typeCode: 'TREE', typeLabel: 'Árbol', quantity: 1, heightM: null, crownRadiusM: null, ...extra,
});

describe('plantShape', () => {
  it('una planta medida se dibuja con su altura y su copa reales', () => {
    const s = plantShape(plant({ speciesSlug: 'roystonea-regia', typeCode: 'PALM', heightM: 7.5, crownRadiusM: 3.4 }));

    expect(s).toMatchObject({ heightM: 7.5, crownRadiusM: 3.4, shape: 'palm', measured: true });
  });

  it('sin medir usa la altura típica de su especie, con una variación de hasta ±16 %', () => {
    // Ponciana: 8 m típicos en el prototipo.
    const s = plantShape(plant());

    expect(s.measured).toBe(false);
    expect(s.shape).toBe('flat');
    expect(s.heightM).toBeGreaterThanOrEqual(8 * 0.84);
    expect(s.heightM).toBeLessThanOrEqual(8 * 1.16);
  });

  it('la variación es estable: el mismo ejemplar se dibuja siempre igual', () => {
    expect(plantShape(plant())).toEqual(plantShape(plant()));
    expect(plantShape(plant()).heightM).not.toBe(plantShape(plant({ code: 'EV-000401' })).heightM);
  });

  it('una especie sin forma conocida toma la de su tipo de vegetación', () => {
    const s = plantShape(plant({ speciesSlug: 'matthiola-incana', typeCode: 'SHRUB' }));

    expect(s.shape).toBe('round');
    expect(s.heightM).toBeLessThan(2.2);
  });

  it('un tipo desconocido se dibuja como árbol en vez de fallar', () => {
    expect(plantShape(plant({ speciesSlug: 'x', typeCode: 'NUEVO' })).shape).toBe('round');
  });

  it('las trepadoras se distinguen por su color de flor', () => {
    expect(plantShape(plant({ speciesSlug: 'bougainvillea-glabra', typeCode: 'CLIMBER' })).color).toBe('#D39BC4');
  });

  it('solo los árboles y palmeras de más de 2.5 m llevan tronco', () => {
    expect(plantShape(plant()).trunk).toBe(true);
    expect(plantShape(plant({ speciesSlug: 'dypsis-lutescens', typeCode: 'PALM', heightM: 2 })).trunk).toBe(false);
    expect(plantShape(plant({ speciesSlug: 'coffea-arabica', typeCode: 'SHRUB' })).trunk).toBe(false);
  });

  it('ignora una medida absurda y vuelve a la típica', () => {
    expect(plantShape(plant({ heightM: 0.1 })).measured).toBe(false);
  });
});
