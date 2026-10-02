/** Entrega al navegador un archivo generado por la API para que lo guarde. */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // El navegador ya tomó el archivo con el clic; la URL solo ocuparía memoria.
  URL.revokeObjectURL(url);
}
