import { expect, test } from 'vitest';
import { componenteDeEscena } from './componentes';

test('devuelve el componente registrado', () => {
  const Inicio = () => null;
  expect(componenteDeEscena({ escenas: { inicio: Inicio }, escalas: {}, carpetaVoz: 'voz' }, 'inicio')).toBe(Inicio);
});

test('falla nombrando la escena sin componente', () => {
  expect(() => componenteDeEscena({ escenas: {}, escalas: {}, carpetaVoz: 'voz' }, 'reservas')).toThrow(
    'La escena reservas no tiene componente',
  );
});
