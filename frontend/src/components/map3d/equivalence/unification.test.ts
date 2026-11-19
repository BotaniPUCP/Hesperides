import { rigidAlignment, unifiedEntries, exceptions } from './unification';
import type { SceneData } from '../sceneData';
import type { Relation } from './relations';

it('aligns with rotation and translation while preserving scale and handedness', () => {
  const points: [number, number][] = [[0, 0], [100, 0], [0, 80], [100, 80]];
  const fit = rigidAlignment(points.map((from, i) => ({ id: String(i), from, to: [10 - from[1], 20 + from[0]] })));
  expect(fit.c).toBeCloseTo(0); expect(fit.s).toBeCloseTo(1);
  expect(fit.dx).toBeCloseTo(10); expect(fit.dz).toBeCloseTo(20);
  expect(fit.median).toBeLessThan(1e-8); expect(fit.scale).toBe(1); expect(fit.reflected).toBe(false);
});
it('applies name precedence and explicit geometry exceptions without modifying relations', () => {
  const data = { campusBuildings: [{ props: { id: '22', name: 'Laboratorio de Mecánica' } }, { props: { id: '95', name: 'Nombre viejo' } }, { props: { id: '150', name: 'N7 anterior' } }, { props: { id: '113', name: 'Investigación' } }] } as unknown as SceneData;
  const relation = (id: string, mapIds: string[], code: string, name?: string): Relation => ({ id, mapIds, skpIds: ['part'], code, name, note: '', updatedAt: '2026-11-12T00:00:00Z' });
  const input = [relation('a', ['22'], 'C53'), relation(exceptions.kiosk, ['95'], '', 'Caseta Comedor Generales Ciencias'), relation(exceptions.leftOnly, ['150'], '', 'Sub-estación N-7'), relation('b', ['113'], '62', 'Old')];
  const before = JSON.stringify(input), entries = unifiedEntries(data, input);
  expect(entries[0].name).toBe('Aulas Móviles A');
  expect(entries[1].source).toBe('Forma SKP / medidas izquierdas'); expect(entries[1].name).toBe('Caseta Comedor Generales Ciencias');
  expect(entries[2].source).toBe('Mapa izquierdo');
  expect(entries[3].name).toBe('Instituto de Ciencias Ómicas y Biotecnología Aplicada');
  expect(JSON.stringify(input)).toBe(before);
});
import { entryMatches } from './unification';
import snapshot from './final-relations.json';
it('detaches the hut once, preserves the original relations, and resolves confirmed aliases', () => {
  const scene = { campusBuildings: [{ props: { id: '54', name: 'CISE' } }] } as unknown as SceneData;
  const before = JSON.stringify(snapshot.relations);
  const entries = unifiedEntries(scene, snapshot.relations as Relation[]);
  const hut = entries.find((e) => e.name === 'Lugar prestado')!;
  expect(hut.skpIds).toEqual(['C-161', 'C-1970']);
  expect(entries.filter((e) => e.skpIds.includes('C-161'))).toHaveLength(1);
  expect(entries.find((e) => e.codes.includes('39'))!.skpIds).toEqual(['B-262']);
  expect(entries.filter((e) => entryMatches(e, 'labcert')).map((e) => e.codes)).toEqual([['46']]);
  expect(entries.filter((e) => entryMatches(e, 'CISE')).map((e) => e.codes)).toEqual([['C39']]);
  expect(entries.find((e) => e.codes.includes('C37'))!.aliases).toContain('CFCO');
  expect(entryMatches(entries.find((e) => e.codes.includes('7'))!, 'ingenieria mecatronica')).toBe(true);
  expect(entries.find((e) => e.codes.includes('39'))!.floors.find((f) => f.floor === 'S')!.places).toContain('Archivo General');
  expect(JSON.stringify(snapshot.relations)).toBe(before);
});
