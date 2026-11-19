export const FREQUENCIES_PATH = '/intervenciones/frecuencias';

/** Lo que la pantalla de frecuencias guarda en su URL: al regresar, la tabla vuelve filtrada. */
export const FREQUENCY_LIST_DEFAULTS = { search: '', regime: '', ruleType: '' };

/** El aviso que la lista muestra al volver de crear, editar o desactivar una frecuencia. */
export interface FrequencyFlash {
  type: 'success' | 'error';
  message: string;
  warnings?: string[];
}

const FLASH_KEY = 'hesperides:frequencies-flash';

/** Deja el aviso para la lista. Si el navegador no guarda nada, la lista simplemente no lo muestra. */
export function saveFrequencyFlash(flash: FrequencyFlash) {
  try { sessionStorage.setItem(FLASH_KEY, JSON.stringify(flash)); } catch { /* sin almacenamiento */ }
}

/** Lee el aviso una sola vez. */
export function takeFrequencyFlash(): FrequencyFlash | null {
  try {
    const raw = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    return raw ? (JSON.parse(raw) as FrequencyFlash) : null;
  } catch {
    return null;
  }
}
