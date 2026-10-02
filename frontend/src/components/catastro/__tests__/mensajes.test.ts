import { ApiError } from '@/lib/api';
import { mensajeDeErrorCatastro, traducirMensajeCatastro } from '../mensajes';

describe('traducirMensajeCatastro', () => {
  it.each([
    ['«12,0a» is not a number', '«12,0a» no es un número'],
    ['«x» must be si or no', '«x» debe ser «si» o «no»'],
    ['Required value is empty', 'Es obligatorio y está vacío'],
    ['The point is outside the campus', 'El punto cae fuera del campus: revisa la latitud y la longitud (¿están invertidas?)'],
    ['The file «molle.jpg» is not in the uploaded ZIP', 'El archivo «molle.jpg» no está en el ZIP de fotos'],
    ['Decide on the possible duplicates at lines [3, 7]', 'Falta decidir los posibles duplicados de las líneas 3, 7'],
    ['Possible duplicate of EV-000001', 'Podría ser el ejemplar EV-000001, que ya está registrado'],
    ['«a.jpg» in the ZIP is larger than 25 MB', '«a.jpg» del ZIP pesa más de 25 MB'],
    ['The ZIP is larger than 500 MB once uncompressed', 'El ZIP de fotos supera los 500 MB descomprimido'],
    ['The photo is larger than 25 MB', 'La foto pesa más de 25 MB'],
    ['Another import is in progress. Try again in a few minutes', 'Hay otra importación en curso. Inténtalo en unos minutos'],
    ['Another photo of this species already has order 2', 'Otra foto de esta especie ya tiene el orden 2'],
    ['The source must be a web link (https://…)', 'La fuente debe ser un enlace web (https://…)'],
    [
      'Species «schinus-molle» kept its previous photos: 1 of 3 could not be saved',
      'La especie «schinus-molle» conserva sus fotos anteriores: 1 de 3 no se pudieron guardar',
    ],
  ])('%s', (ingles, espanol) => {
    expect(traducirMensajeCatastro(ingles)).toBe(espanol);
  });

  it('traduce también la causa de una foto que no se guardó', () => {
    expect(traducirMensajeCatastro('Photo not saved: HTTP 404')).toBe('La foto no se guardó: Drive respondió con error 404');
  });

  it('el formulario añade la columna entre paréntesis: se traduce igual', () => {
    expect(traducirMensajeCatastro('The point is outside the campus (latitud)')).toMatch(/^El punto cae fuera/);
  });

  it('un mensaje desconocido se muestra tal cual en vez de ocultarse', () => {
    expect(traducirMensajeCatastro('Something new')).toBe('Something new');
  });
});

describe('mensajeDeErrorCatastro', () => {
  it('traduce los 400, 409 y 422 del catastro', () => {
    expect(mensajeDeErrorCatastro(new ApiError(422, 'This import was already confirmed or expired'))).toBe(
      'Esta carga ya se confirmó o venció',
    );
  });

  it('un 500 no muestra el texto del backend', () => {
    expect(mensajeDeErrorCatastro(new ApiError(500, 'NullPointerException'))).toBe('Error del servidor. Intente más tarde.');
  });
});
