/**
 * Animación «en dos»: personas y Hespo cambian de dibujo cada 2 cuadros, como la animación
 * tradicional, mientras la cámara, las capturas y los subtítulos siguen en unos.
 */
export const enDos = (frame: number): number => Math.floor(frame / 2) * 2;
