import type { SequenceHooks } from '../viewer/sequenceHooks';
import { composeFrame, type FrameSize, type LogoLayer } from './frameCompositor';
import { logoAt, type LogoState } from './logoMotion';
import { cameraPoseAt, SEQUENCE_DURATION_S } from './sequencePath';
import { frameAt, type SequenceLook } from './sequenceTimeline';

/**
 * Exporta la secuencia cuadro a cuadro (SPEC-118 §8): el reloj no es real, así
 * que el video sale fluido aunque el equipo dibuje cada cuadro lento.
 */

export const EXPORT_SIZE: FrameSize = { width: 1920, height: 1080 };
export const EXPORT_FPS = 60;
/** De t = 0 a t = 12 s, ambos incluidos. */
export const EXPORT_FRAMES = SEQUENCE_DURATION_S * EXPORT_FPS + 1;

export type ExportViewer = Pick<SequenceHooks, 'beginExport' | 'endExport' | 'setSequenceLook' | 'setPoseNow' | 'freezeFrame'>;

/** Recibe cada cuadro ya compuesto en el canvas de salida. */
export interface FrameSink {
  add: (timestampS: number, durationS: number) => Promise<void>;
  finish: () => Promise<Blob>;
  cancel: () => Promise<void>;
}

export interface ExportJob {
  viewer: ExportViewer;
  /** El canvas de salida, de EXPORT_SIZE: el sumidero lee de él. */
  canvas: HTMLCanvasElement;
  sink: FrameSink;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  /** Las dos imágenes del logo de §9, ya cargadas; sin ellas, el video va sin logo. */
  logos?: Record<LogoState['image'], CanvasImageSource>;
  /** Entre cuadros: deja ver el avance y no congela la pestaña. */
  breathe?: () => Promise<unknown>;
}

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

function logoLayer(t: number, logos: ExportJob['logos']): LogoLayer | undefined {
  if (!logos) return undefined;
  const state = logoAt(t, EXPORT_SIZE.width / EXPORT_SIZE.height);
  return { image: logos[state.image], state, smooth: state.image === 'original' };
}

async function renderFrames({ viewer, canvas, sink, logos, onProgress, signal, breathe = yieldToBrowser }: ExportJob): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no dio un contexto 2D para componer el video');
  const step = 1 / EXPORT_FPS;
  let look: SequenceLook = 'low';
  let frozen: HTMLCanvasElement | null = null;
  viewer.setSequenceLook(look);
  for (let i = 0; i < EXPORT_FRAMES; i++) {
    const t = i * step, f = frameAt(t);
    if (f.look !== look) {
      frozen = viewer.freezeFrame();
      viewer.setSequenceLook(f.look);
      look = f.look;
    }
    viewer.setPoseNow(cameraPoseAt(t));
    composeFrame(ctx, EXPORT_SIZE, viewer.freezeFrame(), f.frozenOpacity > 0 ? frozen : null, f, logoLayer(t, logos));
    await sink.add(t, step);
    onProgress?.((i + 1) / EXPORT_FRAMES);
    if (signal?.aborted) throw new Error('Exportación cancelada');
    await breathe();
  }
}

export async function exportSequence(job: ExportJob): Promise<Blob> {
  job.viewer.beginExport(EXPORT_SIZE.width, EXPORT_SIZE.height);
  try {
    await renderFrames(job);
    return await job.sink.finish();
  } catch (error) {
    await job.sink.cancel();
    throw error;
  } finally {
    job.viewer.endExport();
  }
}
