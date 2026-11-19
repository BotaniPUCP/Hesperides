import type { Balloon } from '@shared/types';
import {
  attentionDot, BALLOON_GROW_FROM_M, BALLOON_MAX_SCALE, balloonIcon, balloonLabel, balloonScale, groupBySector,
  memberNearestCenter, mergeOverlapping,
} from '../balloons/balloonClusters';

const balloon = (id: string, over: Partial<Balloon> = {}): Balloon => ({
  id, kind: 'INTERVENTION', variant: null, attention: false, latitude: -12, longitude: -77, sectorId: 1, memberCount: 1,
  card: { title: `Globo ${id}`, status: 'En ejecución', lines: [], progress: null, photoUrl: null, href: '/x' },
  ...over,
});

describe('globos: dibujo y nombre (SPEC-113 §7.1)', () => {
  it('cada tipo y urgencia tiene su dibujo', () => {
    expect(balloonIcon(balloon('a', { kind: 'INCIDENT', variant: 'HIGH' }))).toBe('/map/balloons/incidencia-alta.svg');
    expect(balloonIcon(balloon('b', { kind: 'INCIDENT', variant: 'NONE' }))).toBe('/map/balloons/incidencia-sin-urgencia.svg');
    expect(balloonIcon(balloon('c', { kind: 'IRRIGATION' }))).toBe('/map/balloons/riego-en-curso.svg');
    expect(balloonIcon(balloon('d', { kind: 'IRRIGATION_DUE', variant: 'OVERDUE' }))).toBe('/map/balloons/seccion-por-regar.svg');
    expect(balloonIcon(balloon('e', { kind: 'RESERVATION' }))).toBe('/map/balloons/reserva-en-curso.svg');
  });

  it('el nombre accesible dice el tipo, la urgencia y el título', () => {
    expect(balloonLabel(balloon('a', { kind: 'INCIDENT', variant: 'HIGH' }))).toBe('Incidencia alta: Globo a');
    expect(balloonLabel(balloon('b', { kind: 'INCIDENT', variant: 'NONE' }))).toBe('Incidencia sin urgencia: Globo b');
    expect(balloonLabel(balloon('c', { kind: 'RESERVATION' }))).toBe('Reserva en curso: Globo c');
  });
});

describe('globos de lejos: uno por sector (SPEC-113 §5.4)', () => {
  it('junta por sector y los sin sector van a «Otros», conservando el orden de urgencia', () => {
    const groups = groupBySector([balloon('1', { sectorId: 2 }), balloon('2', { sectorId: 1 }),
      balloon('3', { sectorId: null }), balloon('4', { sectorId: 2 })]);

    expect(groups.map((g) => [g.key, g.members.map((m) => m.id)])).toEqual([
      ['sector:2', ['1', '4']], ['sector:1', ['2']], ['sector:otros', ['3']]]);
  });
});

describe('globos de cerca: los que se pisan se juntan', () => {
  const size = { w: 40, h: 41 };

  it('dos globos que se pisan son un grupo de 2 en el sitio del más urgente', () => {
    const merged = mergeOverlapping([
      { balloon: balloon('urgente'), x: 100, y: 100 },
      { balloon: balloon('cerca'), x: 120, y: 110 },
      { balloon: balloon('lejos'), x: 300, y: 300 },
    ], size);

    expect(merged.map((c) => [c.x, c.y, c.members.map((m) => m.id)])).toEqual([
      [100, 100, ['urgente', 'cerca']], [300, 300, ['lejos']]]);
  });

  it('sin globos no hay grupos', () => {
    expect(mergeOverlapping([], size)).toEqual([]);
  });
});

describe('el punto del grupo es la atención más urgente que contiene (CA-08)', () => {
  it('una incidencia alta pinta el punto de rojo; sin atención no hay punto', () => {
    expect(attentionDot([balloon('r'), balloon('i', { kind: 'INCIDENT', variant: 'HIGH', attention: true })])).toBe('#E53935');
    expect(attentionDot([balloon('s', { kind: 'INCIDENT', variant: 'NONE', attention: true })])).toBe('#FFFFFF');
    expect(attentionDot([balloon('r')])).toBeNull();
  });
});

describe('acercarse: el globo deja de achicarse y los grupos se clavan sobre un jardín', () => {
  it('lejos conserva su tamaño; cerca crece con el mapa hasta el tope', () => {
    expect(balloonScale(BALLOON_GROW_FROM_M * 3)).toBe(1);
    expect(balloonScale(BALLOON_GROW_FROM_M)).toBe(1);
    expect(balloonScale(BALLOON_GROW_FROM_M / 1.5)).toBeCloseTo(1.5);
    expect(balloonScale(1)).toBe(BALLOON_MAX_SCALE);
  });

  it('un grupo se clava sobre el miembro más cercano al centro, nunca en el promedio entre jardines', () => {
    const points = [{ x: 0, z: 0 }, { x: 9, z: 1 }, { x: 10, z: 0 }, { x: 30, z: 0 }];
    expect(memberNearestCenter(points)).toBe(2);
  });

  it('con un solo miembro, ese es el sitio', () => {
    expect(memberNearestCenter([{ x: 4, z: 5 }])).toBe(0);
  });
});
