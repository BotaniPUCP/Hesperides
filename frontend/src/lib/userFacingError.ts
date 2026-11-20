/**
 * Un fallo que nuestro propio código explica en español para la persona. Es el
 * único error, fuera de los de la API (mensajeDeApiError), cuyo mensaje se
 * muestra tal cual: los demás (JSON inválido, red, el navegador) pueden venir en
 * inglés técnico (SPEC-000).
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

/** El mensaje para la persona: el propio si es un UserFacingError; si no, `fallback`. */
export function userFacingMessage(error: unknown, fallback: string): string {
  return error instanceof UserFacingError ? error.message : fallback;
}
