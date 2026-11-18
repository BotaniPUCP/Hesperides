// Deja correr desde Node los módulos TypeScript del visor: los compila con el TypeScript del proyecto (como
// portable-ts-loader.cjs para webpack) y les completa la extensión que el código omite, `./lookTable` →
// `./lookTable.ts`. Lo registra ts-register.mjs.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const CANDIDATES = ['.ts', '.tsx', '/index.ts'];
const COMPILER = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX };

export async function load(url, context, next) {
  if (!/\.tsx?$/.test(url)) return next(url, context);
  const file = fileURLToPath(url);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: COMPILER });
  return { format: 'module', source: outputText, shortCircuit: true };
}

export async function resolve(specifier, context, next) {
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  if (relative && context.parentURL && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
    for (const suffix of CANDIDATES) {
      const url = new URL(specifier + suffix, context.parentURL);
      if (fs.existsSync(fileURLToPath(url))) return next(url.href, context);
    }
  }
  return next(specifier, context);
}
