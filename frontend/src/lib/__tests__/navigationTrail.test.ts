import { advanceTrail, previousPath, recordVisit, restartTrail } from '../navigationTrail';

describe('advanceTrail', () => {
  it('agrega una pantalla nueva', () => {
    expect(advanceTrail(['/a'], '/b')).toEqual(['/a', '/b']);
  });

  it('la misma pantalla no cambia el recorrido, por ejemplo al filtrar', () => {
    expect(advanceTrail(['/a', '/b'], '/b')).toEqual(['/a', '/b']);
  });

  it('regresar a la pantalla anterior retrocede: la flecha no rebota entre dos', () => {
    expect(advanceTrail(['/especie', '/lista', '/ficha'], '/lista')).toEqual(['/especie', '/lista']);
  });

  it('guardar un formulario no deja el formulario en el recorrido', () => {
    expect(advanceTrail(['/lugar', '/lugar/editar'], '/lugar')).toEqual(['/lugar']);
  });
});

describe('recorrido de la sesión', () => {
  beforeEach(() => restartTrail('/inicio'));

  it('al empezar no hay a dónde volver', () => {
    expect(previousPath()).toBeNull();
  });

  it('recuerda la pantalla anterior', () => {
    recordVisit('/especie');
    expect(previousPath()).toBe('/inicio');
  });

  it('entrar por el menú empieza un recorrido nuevo', () => {
    recordVisit('/especie');
    restartTrail('/lista');
    recordVisit('/lista');
    expect(previousPath()).toBeNull();
  });
});
