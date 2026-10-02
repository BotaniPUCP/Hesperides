import { LIMITES, motivoDeRechazo } from '../upload-limits';

const archivo = (bytes: number) => {
  const f = new File([''], 'foto.jpg');
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
};

describe('upload-limits', () => {
  it('son los acordados en SPEC-104 D-07', () => {
    expect(LIMITES.foto.bytes).toBe(25 * 1024 * 1024);
    expect(LIMITES.subida.bytes).toBe(250 * 1024 * 1024);
  });

  it('acepta un archivo en el límite', () => {
    expect(motivoDeRechazo(archivo(LIMITES.foto.bytes), LIMITES.foto)).toBeNull();
  });

  it('rechaza uno que lo pasa, con su peso y el máximo', () => {
    expect(motivoDeRechazo(archivo(31 * 1024 * 1024), LIMITES.foto)).toBe(
      'El archivo pesa 31 MB; el máximo es 25 MB.',
    );
  });
});
