import type { FrameSink } from './exportSequence';
import { UserFacingError } from '@/lib/userFacingError';

/**
 * El sumidero MP4 de la exportación (SPEC-118 D-07): Mediabunny codifica el canvas
 * en H.264 con WebCodecs y lo empaqueta. Se importa al exportar, no con el mapa.
 */

const BITRATE_BPS = 16_000_000;
/** Un cuadro clave por segundo: el video se puede adelantar en cualquier reproductor. */
const KEY_FRAME_INTERVAL_S = 1;

export async function createMp4Sink(canvas: HTMLCanvasElement, fps: number): Promise<FrameSink> {
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo } = await import('mediabunny');
  const supported = typeof VideoEncoder !== 'undefined'
    && await canEncodeVideo('avc', { width: canvas.width, height: canvas.height, bitrate: BITRATE_BPS });
  if (!supported) {
    throw new UserFacingError('Este navegador no puede codificar video H.264. Usa Chrome o Edge actualizados.');
  }
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: BITRATE_BPS, keyFrameInterval: KEY_FRAME_INTERVAL_S });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  return {
    add: (timestampS, durationS) => source.add(timestampS, durationS),
    async finish() {
      await output.finalize();
      if (!target.buffer) throw new UserFacingError('El video quedó vacío al cerrarlo.');
      return new Blob([target.buffer], { type: 'video/mp4' });
    },
    async cancel() {
      if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel();
    },
  };
}
