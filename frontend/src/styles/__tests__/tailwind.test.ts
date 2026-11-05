/** @jest-environment node */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import postcss, { type Root } from 'postcss';

let stylesheet: Root;

beforeAll(() => {
  // Compile outside Jest's VM so Tailwind can load its native scanner and config.
  const css = execFileSync(process.execPath, ['-e', `
    const fs = require('node:fs');
    const path = require('node:path');
    const postcss = require('postcss');
    const config = require('./postcss.config');
    const plugins = Object.entries(config.plugins).map(([name, options]) => require(name)(options));
    const from = path.resolve('src/styles/globals.css');
    postcss(plugins).process(fs.readFileSync(from, 'utf8'), { from })
      .then(result => process.stdout.write(result.css))
      .catch(error => { console.error(error); process.exitCode = 1; });
  `], {
    cwd: path.resolve(__dirname, '../../..'),
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    timeout: 20_000,
  });
  stylesheet = postcss.parse(css);
}, 25_000);

function values(selector: string, property: string): string[] {
  const found: string[] = [];
  stylesheet.walkRules(selector, rule => {
    rule.walkDecls(property, declaration => { found.push(declaration.value); });
  });
  return found;
}

it('compiles semantic utilities from the shared configuration', () => {
  expect(values('.bg-neutral-0', 'background-color')).toContain('rgb(var(--color-neutral-0) / 1)');
  expect(values('.text-neutral-900', 'color')).toContain('rgb(var(--color-neutral-900) / 1)');
  expect(values('.bg-brand-600', 'background-color')).toContain('rgb(var(--color-brand-600) / 1)');
  expect(values('.bg-status-resolved-bg', 'background-color')).toContain('rgb(var(--color-status-resolved-bg) / 1)');
});

it('preserves light and dark channel values without overriding them with theme variables', () => {
  expect(values(':root', '--color-neutral-0')).toEqual(['255 255 255']);
  expect(values('.dark', '--color-neutral-0')).toEqual(['15 23 42']);
  expect(values(':root', '--color-brand-700')).toEqual(['21 128 61']);
  expect(values('.dark', '--color-brand-700')).toEqual(['74 222 128']);
});

it('preserves the fixed forest palette and opacity modifiers', () => {
  expect(values('.bg-forest-700', 'background-color')).toContain('#15803d');
  expect(values('.bg-forest-800', 'background-color')).toContain('#166534');
  expect(values('.bg-neutral-0\\/95', 'background-color')).toContain(
    'color-mix(in oklab, rgb(var(--color-neutral-0) / 1) 95%, transparent)',
  );
});

it('generates the migrated focus, shadow and radius utilities', () => {
  expect(values('.focus-visible\\:outline-hidden:focus-visible', 'outline-style')).toContain('none');
  expect(values('.focus-visible\\:outline-hidden:focus-visible', 'outline')).toContain('2px solid transparent');
  expect(values('.shadow-xs', '--tw-shadow')).toContain('0 1px 2px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.05))');
  expect(values('.rounded-xs', 'border-radius')).toContain('var(--radius-xs)');
});
