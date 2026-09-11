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

  it('descarta el 0 que produce `nodo && clase` con un nodo vacio', () => {
    // `leadingIcon && 'pl-10'` evalua a 0, no a false, si leadingIcon es 0.
    // Sin filtrarlo acabaria como la clase literal "0".
    expect(cn('base', 0, 'extra')).toBe('base extra');
    expect(cn('base', '')).toBe('base');
  });
});
