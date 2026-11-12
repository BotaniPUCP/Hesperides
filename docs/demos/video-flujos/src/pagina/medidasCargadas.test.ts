import { expect, test } from 'vitest';
import { crearMedida } from './medidasCargadas';

const datos = { lista: { fila: { x: 1, y: 2, ancho: 3, alto: 4 } } };

test('devuelve la medida de un elemento', () => {
  expect(crearMedida(datos, 'npm run capturas:planificacion')('lista', 'fila')).toEqual({ x: 1, y: 2, ancho: 3, alto: 4 });
});

test('falla nombrando captura, elemento y comando', () => {
  expect(() => crearMedida(datos, 'npm run capturas:planificacion -- --sesion a')('lista', 'boton')).toThrow(
    'Falta boton en la captura lista: ejecuta npm run capturas:planificacion -- --sesion a',
  );
});
