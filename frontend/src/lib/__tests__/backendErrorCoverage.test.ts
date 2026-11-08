import fs from 'fs';
import path from 'path';
import { ApiError } from '../api';
import { mensajeDeApiError } from '../api-errors';
import { interventionError } from '../interventions-api';
import { mensajeDeErrorCatastro } from '@/components/catastro/mensajes';
import { isSpanishBackendMessage } from '../backendSpanishMessages';

/**
 * Cada error 400/409/422 que el backend puede responder llega a la persona en
 * español y con su motivo, no con un mensaje genérico. El backend habla inglés
 * técnico a propósito (SPEC-000): si alguien agrega una regla nueva sin su
 * traducción, este test lo dice antes de que llegue a producción.
 */

const BACKEND = path.resolve(__dirname, '../../../../backend/src/main/java');
const STATUS: Record<string, number> = {
  ValidationException: 400, BusinessRuleException: 422, ConflictException: 409,
  DuplicateResourceException: 409, OperationInProgressException: 409, PossibleDuplicateException: 409,
};
const START = new RegExp(`new (${Object.keys(STATUS).join('|')})\\(`, 'g');

/**
 * Errores que solo provoca una petición mal armada por el propio frontend
 * (paginación, orden, claves de idempotencia): la persona no puede corregirlos,
 * así que el mensaje genérico es la respuesta correcta.
 */
const TECHNICAL = [
  /^sort must be one of /, /^direction must be asc or desc$/, /^page must be /, /^size must be between /,
  /^limit must be between /, /^Page size must be between /, /^Unsupported intervention sort field$/,
  /^Idempotency-Key UUID is required$/, /^Request is required$/, /^Invalid request: /, /^Version is required$/,
];

const GENERIC = new Set([
  'La operación no cumple una regla del sistema.', 'Revisa los datos ingresados.',
  'Ocurrió un error inesperado. Inténtalo de nuevo.',
]);

interface Thrown { status: number; message: string; where: string }

function javaFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return javaFiles(full);
    return entry.name.endsWith('.java') ? [full] : [];
  });
}

/** El primer argumento del constructor, hasta la coma o el paréntesis que lo cierra. */
function firstArgument(source: string, start: number): string {
  let depth = 0;
  let inString = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '(') depth++;
    else if (c === ')' && depth-- === 0) return source.slice(start, i);
    else if (c === ',' && depth === 0) return source.slice(start, i);
  }
  return source.slice(start);
}

/** Las ramas de un `cond ? "a" : "b"`; una sola si no es ternario. */
function branches(expression: string): string[] {
  let inString = false;
  for (let i = 0; i < expression.length; i++) {
    const c = expression[i];
    if (c === '"' && expression[i - 1] !== '\\') inString = !inString;
    if (!inString && c === '?') {
      const rest = expression.slice(i + 1);
      const colon = rest.search(/"\s*:\s*"/);
      if (colon >= 0) return [rest.slice(0, colon + 1), rest.slice(colon + 1).replace(/^\s*:/, '')];
    }
  }
  return [expression];
}

/** El texto que la persona vería: las partes literales tal cual y cada variable con un valor de muestra. */
function sample(expression: string): string | null {
  const literal = /"((?:[^"\\]|\\.)*)"/g;
  if (!literal.test(expression)) return null;
  literal.lastIndex = 0;
  let text = '';
  let last = 0;
  for (const m of expression.matchAll(literal)) {
    const between = expression.slice(last, m.index).replace(/[+\s]/g, '');
    if (between) text += between.includes('LABEL') ? '10 MB' : '1';
    text += m[1].replace(/\\"/g, '"');
    last = (m.index ?? 0) + m[0].length;
  }
  const tail = expression.slice(last).replace(/[+\s]/g, '');
  if (tail && !tail.startsWith('.formatted')) text += tail.includes('LABEL') ? '10 MB' : '1';
  return text;
}

function thrownByBackend(): Thrown[] {
  return javaFiles(BACKEND).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return [...source.matchAll(START)].flatMap((m) =>
      branches(firstArgument(source, (m.index ?? 0) + m[0].length))
        .map(sample)
        // Sin letras propias (p. ej. «mensaje (columna)» de otro error ya traducido): no hay nada que traducir aquí.
        .filter((message): message is string => message !== null && /[a-záéíóúñ]{3}/i.test(message.replace(/^1 \(1\)$/, '')))
        .map((message) => ({ status: STATUS[m[1]], message, where: path.basename(file) })));
  });
}

function translated({ status, message }: Thrown): boolean {
  const error = new ApiError(status, message);
  return [mensajeDeApiError(error), interventionError(error), mensajeDeErrorCatastro(error)]
    .some((shown) => !GENERIC.has(shown) && !shown.startsWith('El trabajo cambió o hay un envío en curso') && (shown !== message || isSpanishBackendMessage(message)));
}


describe('cobertura de los errores del backend', () => {
  const thrown = thrownByBackend();

  it('encuentra los errores del backend (si no, el test no estaría mirando nada)', () => {
    expect(thrown.length).toBeGreaterThan(150);
  });

  it('cada error que la persona puede provocar se muestra en español y con su motivo', () => {
    const missing = thrown
      .filter((t) => !TECHNICAL.some((pattern) => pattern.test(t.message)))
      .filter((t) => !translated(t))
      .map((t) => `${t.status} ${t.where}: ${t.message}`);

    expect(missing).toEqual([]);
  });
});
