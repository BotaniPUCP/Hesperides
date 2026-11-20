import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    // Generado por scripts/build-portable.cjs: lleva three.js empaquetado, que ESLint no
    // entiende (confunde useMultisampledRTT con un hook). Su fuente, portableApp.ts, sí se revisa.
    ignores: ['public/models/equivalence/portable.js'],
  },
];

export default eslintConfig;
