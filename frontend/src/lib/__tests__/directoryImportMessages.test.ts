import { ApiError } from '../api';
import { mensajeDeApiError } from '../api-errors';
import { issueMessage } from '../directoryImportMessages';

describe('motivos del registro masivo (SPEC-106)', () => {
  it.each([
    [{ column: 'nombre', code: 'REQUIRED', detail: null }, 'Falta «nombre».'],
    [{ column: 'tipo', code: 'UNKNOWN_TYPE', detail: 'Ministerio' }, '«Ministerio» no es un tipo válido: usa «Unidad PUCP» o «Empresa externa».'],
    [{ column: 'nombre', code: 'NAME_TAKEN', detail: 'Estudios Generales Ciencias' }, 'Ese nombre o alias ya lo usa «Estudios Generales Ciencias».'],
    [{ column: 'celular', code: 'MOBILE_FORMAT', detail: null }, 'El celular debe tener 9 dígitos y empezar con 9.'],
    [{ column: 'nombre', code: 'DESCONOCIDO', detail: null }, 'Revisa «nombre».'],
  ])('traduce %o', (issue, esperado) => {
    expect(issueMessage({ line: 2, ...issue })).toBe(esperado);
  });

  it.each([
    [422, 'The file has rows with errors: fix them and upload it again', 'El archivo tiene filas con errores: corrígelas y vuelve a subirlo. No se guardó nada.'],
    [400, 'The file is missing the columns: tipo, ruc', 'Al archivo le faltan las columnas: tipo, ruc. Usa la plantilla.'],
    [400, 'The file has more than 2000 rows: split it into smaller files', 'El archivo tiene más de 2000 filas: divídelo en archivos más pequeños.'],
    [400, 'The file is empty', 'El archivo está vacío.'],
  ])('traduce el error %i «%s»', (status, backend, esperado) => {
    expect(mensajeDeApiError(new ApiError(status, backend, null))).toBe(esperado);
  });
});
