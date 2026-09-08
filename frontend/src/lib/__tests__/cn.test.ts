import { cn } from '../cn';

describe('cn', () => {
  it('une varias clases con un espacio', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('descarta los valores falsos', () => {
    expect(cn('base', false, null, undefined, 'extra')).toBe('base extra');
  });

  it('permite clases condicionales', () => {
    const isActive = false;
    expect(cn('btn', isActive && 'btn-active')).toBe('btn');
  });

  it('devuelve cadena vacia sin argumentos utiles', () => {
    expect(cn(false, null)).toBe('');
  });
});
