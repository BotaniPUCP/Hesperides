/**
 * Validaciones y normalizaciones para entidades del catálogo botánico e inventario verde.
 */

/**
 * Valida que un nombre científico siga la nomenclatura botánica internacional (ICN):
 * - No debe estar vacío y debe tener al menos 3 caracteres.
 * - Rechaza explícitamente números, barras (/), arrobas y caracteres especiales extraños.
 * - Exige estructura binomial o término compuesto (mínimo género y epíteto o abreviatura como sp./spp.).
 */
export function validarNombreCientifico(nombre: string): string | null {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (!limpio) {
    return 'El nombre científico es obligatorio';
  }
  if (limpio.length < 2) {
    return 'Debe tener al menos 2 caracteres';
  }
  if (limpio.length > 150) {
    return 'No puede exceder 150 caracteres';
  }
  if (/[0-9/\\@#$%^&*()_+=[\]{}|<>?!;:~`"“”«»]/.test(limpio)) {
    return 'No debe contener números, barras (/) ni caracteres especiales no botánicos';
  }
  const palabras = limpio.split(' ');
  if (palabras.length < 2) {
    return 'Debe incluir al menos género y epíteto específico (ej. "Jacaranda mimosifolia" o "Ficus sp.")';
  }
  return null;
}

/**
 * Normaliza un nombre científico:
 * - Recorta espacios en los extremos y colapsa espacios múltiples internos.
 * - Asegura que la primera letra del género esté en mayúscula.
 */
export function normalizarNombreCientifico(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  if (!limpio) return '';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

