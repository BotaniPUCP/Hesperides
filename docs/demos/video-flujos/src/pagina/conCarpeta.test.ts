import { expect, test } from 'vitest';
import { conCarpeta, crearMedida } from './medidasCargadas';

const caja = { x: 1, y: 2, ancho: 3, alto: 4 };

test('las medidas de dos carpetas conviven con la carpeta como prefijo', () => {
  const medidas = { ...conCarpeta('venta', { 'mapa-zonas': { mapa: caja } }), ...conCarpeta('planificacion', { 'mapa-zonas': {} }) };
  expect(Object.keys(medidas).sort()).toEqual(['planificacion/mapa-zonas', 'venta/mapa-zonas']);
  expect(crearMedida(medidas, 'cmd')('venta/mapa-zonas', 'mapa')).toEqual(caja);
});
