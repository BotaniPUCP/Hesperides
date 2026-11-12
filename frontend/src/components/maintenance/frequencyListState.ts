export const FREQUENCIES_PATH = '/admin/frecuencias';

/**
 * Lo que la pantalla de frecuencias guarda en su URL. La tabla y el panel de
 * cumplimiento comparten estos valores: con listas separadas, cada uno borraría
 * de la URL los parámetros del otro al escribir los suyos.
 */
export const FREQUENCY_LIST_DEFAULTS = { search: '', regime: '', ruleType: '', from: '', to: '' };
