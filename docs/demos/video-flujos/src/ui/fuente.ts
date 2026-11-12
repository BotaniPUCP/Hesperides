import { loadFont } from '@remotion/google-fonts/Nunito';

// Sin alternativa: si la fuente no carga, el render debe fallar.
export const { fontFamily } = loadFont('normal', { weights: ['700', '800'], subsets: ['latin', 'latin-ext'] });
