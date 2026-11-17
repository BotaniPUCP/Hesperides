import { composeFrame, type Canvas2D } from '../frameCompositor';
import { frameAt, SWAP_AT_S } from '../sequenceTimeline';

/** Un contexto 2D que anota lo que se le pide, con el filtro y la opacidad vigentes en cada dibujo. */
function recordingContext() {
  const log: string[] = [];
  const ctx: Canvas2D = {
    filter: 'none', globalAlpha: 1, imageSmoothingEnabled: true, fillStyle: '#fff',
    save: () => log.push('save'),
    restore: () => log.push('restore'),
    fillRect: (...a: number[]) => log.push(`fillRect ${a.join(',')}`),
    translate: (x: number, y: number) => log.push(`translate ${x},${y}`),
    scale: (x: number, y: number) => log.push(`scale ${x.toFixed(4)},${y.toFixed(4)}`),
    drawImage: (img: CanvasImageSource) => log.push(`draw ${(img as HTMLCanvasElement).id} filter=${ctx.filter} alpha=${ctx.globalAlpha} smooth=${ctx.imageSmoothingEnabled}`),
  };
  return { ctx, log };
}

const named = (id: string) => Object.assign(document.createElement('canvas'), { id });
const SIZE = { width: 1920, height: 1080 };

describe('compositor de cuadros para el video', () => {
  it('un cuadro nítido: fondo negro y la escena sin filtro ni suavizado', () => {
    const { ctx, log } = recordingContext();
    composeFrame(ctx, SIZE, named('scene'), named('frozen'), frameAt(1));
    expect(log).toEqual([
      'save', 'fillRect 0,0,1920,1080',
      'translate 960,540', 'scale 1.0000,1.0000', 'translate -960,-540',
      'draw scene filter=none alpha=1 smooth=false',
      'restore',
    ]);
    expect(ctx.fillStyle).toBe('#000');
  });

  it('en el cambio: desenfoque, brillo y escala, y el cuadro congelado encima', () => {
    const { ctx, log } = recordingContext();
    composeFrame(ctx, SIZE, named('scene'), named('frozen'), frameAt(SWAP_AT_S));
    expect(log).toContain('scale 1.0300,1.0300');
    expect(log).toContain('draw scene filter=blur(8.00px) brightness(1.0400) alpha=1 smooth=false');
    expect(log).toContain('draw frozen filter=blur(8.00px) brightness(1.0400) alpha=1 smooth=false');
    expect(log.indexOf('draw frozen filter=blur(8.00px) brightness(1.0400) alpha=1 smooth=false'))
      .toBeGreaterThan(log.indexOf('draw scene filter=blur(8.00px) brightness(1.0400) alpha=1 smooth=false'));
  });

  it('sin cuadro congelado o con opacidad cero, no lo dibuja', () => {
    const a = recordingContext();
    composeFrame(a.ctx, SIZE, named('scene'), null, frameAt(SWAP_AT_S));
    expect(a.log.filter((l) => l.startsWith('draw'))).toHaveLength(1);
    const b = recordingContext();
    composeFrame(b.ctx, SIZE, named('scene'), named('frozen'), frameAt(8));
    expect(b.log.filter((l) => l.startsWith('draw'))).toHaveLength(1);
  });
});
