import fs from 'fs';
import path from 'path';

/**
 * Una pantalla no muestra el `message` de un error de la API tal cual: puede
 * venir en inglés técnico (SPEC-000). Lo muestra a través de un traductor
 * (mensajeDeApiError, interventionError, mensajeDeErrorCatastro).
 */

const SRC = path.resolve(__dirname, '../..');

/** Donde leer `.message` es legítimo: los propios traductores, y comparaciones exactas que no lo muestran. */
const ALLOWED = new Set([
  'lib/api.ts',
  'lib/api-errors.ts',
  'lib/interventions-api.ts',
  'components/catastro/mensajes.ts',
  // status 0: el mensaje de red ya viene redactado en español desde api.ts.
  'components/auth/LoginForm.tsx',
  // Comparan el mensaje con una constante para decidir qué hacer; no lo muestran.
  'components/interventions/InterventionDetail.tsx',
  'components/interventions/InterventionForm.tsx',
  'components/users/ChangePasswordForm.tsx',
]);

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === '__fixtures__' ? [] : sources(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

it('ninguna pantalla muestra el mensaje crudo de un error de la API', () => {
  const offenders = sources(SRC)
    .map((file) => path.relative(SRC, file).replace(/\\/g, '/'))
    .filter((file) => !ALLOWED.has(file))
    .flatMap((file) => fs.readFileSync(path.join(SRC, file), 'utf8').split('\n')
      .map((line, i) => ({ line, at: `${file}:${i + 1}` }))
      .filter(({ line }) => /\b(err|error|e|ex|failure)\.message\b/.test(line))
      .map(({ at, line }) => `${at} ${line.trim()}`));

  expect(offenders).toEqual([]);
});
