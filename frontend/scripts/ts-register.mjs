// Uso: node --import ./scripts/ts-register.mjs scripts/<herramienta>.mjs
import { register } from 'node:module';

register('./ts-hooks.mjs', import.meta.url);
