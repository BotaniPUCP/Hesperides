/**
 * Animación «en dos»: personas y Hespo cambian de dibujo cada 2 cuadros, como la animación
 * tradicional, mientras la cámara, las capturas y los subtítulos siguen en unos. Redondea antes:
 * las muestras fraccionarias del desenfoque de movimiento caen en el mismo dibujo.
 */
export const enDos = (frame: number): number => Math.floor(Math.round(frame) / 2) * 2;
