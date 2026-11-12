import { buildLookTable, ROW_TEXELS, TEXEL } from '../lookTable';
import { validateLooks, LookError } from '../validateLook';
import type { BuildingLook, FacePattern } from '../types';

const wall: FacePattern = { kind: 'windows', wall: '#ffffff', glass: '#203040', frame: '#101010', floorM: 3.2, sillM: 0.9, windowM: 1.5, widthM: 1.2, moduleM: 2.4 };

const look = (over: Partial<BuildingLook> = {}): BuildingLook => ({
  planKey: 'k1', name: 'Uno', folder: 'uno', photos: ['frente.jpg'],
  zones: [{ id: 'base', roof: '#cccccc', faces: { N: wall, S: { sameAs: 'N' }, other: { kind: 'blind', wall: '#eeeeee' } } }],
  ...over,
});

describe('validateLooks', () => {
  it('acepta una ficha bien formada', () => {
    expect(() => validateLooks([look()], new Set(['k1']))).not.toThrow();
  });

  it('falla si el plan_key no está en el modelo', () => {
    expect(() => validateLooks([look()], new Set(['otro']))).toThrow(LookError);
  });

  it('falla con dos fichas del mismo plan_key', () => {
    expect(() => validateLooks([look(), look()], new Set(['k1']))).toThrow(/repetida/);
  });

  it('falla con un color que no es hexadecimal', () => {
    const bad = look({ zones: [{ id: 'base', roof: 'gris', faces: { other: wall } }] });
    expect(() => validateLooks([bad], new Set(['k1']))).toThrow(/color/);
  });

  it('falla si alféizar más ventana superan el piso', () => {
    const bad = look({ zones: [{ id: 'base', roof: '#cccccc', faces: { other: { ...wall, sillM: 2, windowM: 1.5 } } }] });
    expect(() => validateLooks([bad], new Set(['k1']))).toThrow(/piso/);
  });

  it('falla con medidas negativas o nulas', () => {
    const bad = look({ zones: [{ id: 'base', roof: '#cccccc', faces: { other: { ...wall, moduleM: 0 } } }] });
    expect(() => validateLooks([bad], new Set(['k1']))).toThrow(/positiva/);
  });

  it('falla si una cara copia a otra que no existe', () => {
    const bad = look({ zones: [{ id: 'base', roof: '#cccccc', faces: { E: { sameAs: 'W' }, other: wall } }] });
    expect(() => validateLooks([bad], new Set(['k1']))).toThrow(/W/);
  });

  it('falla con una copia circular', () => {
    const bad = look({ zones: [{ id: 'base', roof: '#cccccc', faces: { E: { sameAs: 'W' }, W: { sameAs: 'E' }, other: wall } }] });
    expect(() => validateLooks([bad], new Set(['k1']))).toThrow(/circular/);
  });

  it('falla si la primera zona tiene selector o una zona siguiente no lo tiene', () => {
    const z = look().zones[0];
    expect(() => validateLooks([look({ zones: [{ ...z, where: { east: [0, 1] } }] })], new Set(['k1']))).toThrow(/primera/);
    expect(() => validateLooks([look({ zones: [z, { ...z, id: 'b' }] })], new Set(['k1']))).toThrow(/selector/);
  });

  it('falla si una ventana suelta es más ancha que su módulo', () => {
    const bad = look({ zones: [{ id: 'base', roof: '#cccccc', faces: { other: { ...wall, widthM: 3 } } }] });
    expect(() => validateLooks([bad], new Set(['k1']))).toThrow(/módulo/);
  });
});

describe('buildLookTable', () => {
  it('da una fila por cara distinta, el techo como muro ciego, y resuelve las copias', () => {
    const table = buildLookTable([look()]);
    const z = table.zones.get('k1')![0];
    expect(z.sides.S).toBe(z.sides.N);
    expect(z.sides.E).toBe(z.sides.W);
    expect(z.sides.N).not.toBe(z.sides.E);
    const roof = table.data.subarray(z.roof * ROW_TEXELS * 4, (z.roof + 1) * ROW_TEXELS * 4);
    expect(roof[TEXEL.kind]).toBe(0);
    expect(roof[0]).toBeCloseTo(0.8, 2);
  });

  it('guarda el primer piso distinto en su propia fila y corre el inicio de los pisos de arriba', () => {
    const face: FacePattern = { ...wall, startM: 0.5, ground: { kind: 'curtain', wall: '#000000', glass: '#334455', heightM: 4 } };
    const table = buildLookTable([look({ zones: [{ id: 'base', roof: '#cccccc', faces: { other: face } }] })]);
    const row = table.zones.get('k1')![0].sides.N;
    const at = (r: number, i: number) => table.data[r * ROW_TEXELS * 4 + i];
    const ground = at(row, TEXEL.groundRow);
    expect(ground).toBeGreaterThanOrEqual(0);
    expect(at(row, TEXEL.startM)).toBeCloseTo(4.5);
    expect(at(ground, TEXEL.kind)).toBe(3);
    expect(at(ground, TEXEL.floorM)).toBeCloseTo(4);
    expect(at(ground, TEXEL.groundRow)).toBe(-1);
  });

  it('pone valores por defecto razonables en lo que la ficha omite', () => {
    const table = buildLookTable([look({ zones: [{ id: 'base', roof: '#cccccc', faces: { other: { kind: 'blind', wall: '#ffffff' } } }] })]);
    const row = table.zones.get('k1')![0].sides.N;
    expect(table.data[row * ROW_TEXELS * 4 + TEXEL.floorM]).toBeGreaterThan(0);
    expect(table.data[row * ROW_TEXELS * 4 + TEXEL.moduleM]).toBeGreaterThan(0);
  });

  it('sin fichas, la tabla tiene una fila vacía para que la textura exista', () => {
    expect(buildLookTable([]).rows).toBe(1);
  });
});
