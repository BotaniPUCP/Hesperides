const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
  },
  // .next/standalone ships its own package.json, which otherwise collides
  // with this project's package.json in Jest's haste module map.
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
};

const nextJestConfig = createJestConfig(customJestConfig);

const NODE_MODULES = '/node_modules/';

/**
 * next/jest no transforma node_modules (salvo sus propios paquetes) y no deja
 * cambiar ese patrón, solo agregar otros. El lector de GLB del visor del mapa
 * (three/examples/jsm) es ESM: se le abre una excepción en ese mismo patrón.
 */
module.exports = async () => {
  const config = await nextJestConfig();
  config.transformIgnorePatterns = config.transformIgnorePatterns.map((pattern) =>
    pattern.startsWith(NODE_MODULES) ? `${NODE_MODULES}(?!three/examples/jsm/)${pattern.slice(NODE_MODULES.length)}` : pattern,
  );
  return config;
};
