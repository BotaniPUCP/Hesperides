import { LOOK_FRAGMENT_HEAD } from '../lookShader';

/**
 * Sin calificador, un sampler2D del fragment shader es lowp: las GPU Mali leen
 * la tabla en 16 bits y los índices de material y región por encima de 2048
 * salen corridos (edificios negros en Android). En escritorio no se nota.
 */
describe('LOOK_FRAGMENT_HEAD', () => {
  it('lee la tabla de fichas con precisión alta', () => {
    expect(LOOK_FRAGMENT_HEAD).toMatch(/uniform\s+highp\s+sampler2D\s+lookTable;/);
  });
});
