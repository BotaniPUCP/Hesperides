/**
 * Quién hace qué en el catastro (SPEC-103 D-03). Es el espejo de los
 * @PreAuthorize del backend, que sigue validando: esto solo evita mostrar lo
 * que el backend negaría.
 */
const CARGAN_CSV = ['ADMIN', 'COORDINADOR'];
const REGISTRAN = ['ADMIN', 'COORDINADOR', 'SUPERVISOR'];
const EDITAN_EJEMPLAR = ['ADMIN', 'COORDINADOR'];

export const puedeCargarCsv = (rol?: string) => CARGAN_CSV.includes(rol ?? '');

export const puedeRegistrar = (rol?: string) => REGISTRAN.includes(rol ?? '');

export const puedeEditarEjemplar = (rol?: string) => EDITAN_EJEMPLAR.includes(rol ?? '');

export const esPersonalOperativo = (rol?: string) => REGISTRAN.includes(rol ?? '');
