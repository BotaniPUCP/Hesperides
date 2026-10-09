/**
 * Cada foto se guarda en dos tamaños: miniatura (400 px) y completa (1600 px).
 * Para que el navegador elija según el tamaño en pantalla (`srcset`); una
 * miniatura estirada en una caja grande se ve borrosa.
 */
export function photoSrcSet(thumbnailUrl: string): string {
  return `${thumbnailUrl} 400w, ${thumbnailUrl.replace('size=thumb', 'size=full')} 1600w`;
}
