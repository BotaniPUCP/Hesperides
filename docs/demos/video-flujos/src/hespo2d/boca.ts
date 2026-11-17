// PRUEBA DESECHABLE (spike): forma de la boca a partir del espectro de la voz.
// En vez de 3 bocas fijas, dos ejes continuos: cuánto se abre y si es ancha (e, i, s) o redonda (o, u).

export type FormaBoca = { abre: number; ancho: number };

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** `muestras`: espectro de 32 bandas de visualizeAudio. */
export function formaDesdeEspectro(muestras: number[]): FormaBoca {
  const graves = media(muestras.slice(0, 4));
  const agudos = media(muestras.slice(6, 16));
  const abre = Math.min(1, (graves * 0.75 + agudos * 0.25) * 7);
  const proporcion = agudos / (graves + agudos + 1e-6);
  const ancho = Math.min(1, Math.max(0, (proporcion - 0.12) / 0.3));
  return { abre: abre < 0.07 ? 0 : abre, ancho };
}

/** Promedia tres cuadros para que la boca no parpadee entre formas. */
export function suavizar(formas: FormaBoca[]): FormaBoca {
  return { abre: media(formas.map((f) => f.abre)), ancho: media(formas.map((f) => f.ancho)) };
}
