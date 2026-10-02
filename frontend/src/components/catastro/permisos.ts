/**
 * Quién hace qué en el catastro (SPEC-103 D-03). Es el espejo de los
 * @PreAuthorize del backend, que sigue validando: esto solo evita mostrar lo
 * que el backend negaría.
 */
const CARGAN_CSV = ['ADMIN', 'COORDINADOR'];
const REGISTRAN = ['ADMIN', 'COORDINADOR', 'SUPERVISOR'];

export const puedeCargarCsv = (rol?: string) => CARGAN_CSV.includes(rol ?? '');

export const puedeRegistrar = (rol?: string) => REGISTRAN.includes(rol ?? '');
