import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const paquete = JSON.parse(readFileSync('package.json', 'utf-8')) as { dependencies: Record<string, string> };

test('todos los paquetes de Remotion usan la misma versión exacta: Remotion se niega a renderizar si difieren', () => {
  const remotion = Object.entries(paquete.dependencies).filter(([nombre]) => nombre === 'remotion' || nombre.startsWith('@remotion/'));
  expect(remotion.length).toBeGreaterThan(1);
  remotion.forEach(([nombre, version]) => expect({ nombre, version }).toEqual({ nombre, version: paquete.dependencies.remotion }));
});
