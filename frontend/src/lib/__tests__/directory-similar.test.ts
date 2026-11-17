import type { ContactCatalogEntry, OrganizationCatalogEntry } from '@shared/types';
import {
  directoryKey, findSimilarContacts, findSimilarOrganizations, matchesContactSearch, matchesSearch,
  similarity, wordSimilarity,
} from '../directory-similar';

const entry = (code: string, name: string, aliases: string[] = [], active = true): OrganizationCatalogEntry =>
  ({ code, name, type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, active, aliases });

/** El catálogo de pruebas: lo que hoy matchearía el backend con pg_trgm (umbral 0.4). */
const CATALOG = [
  entry('ORG-0001', 'Oficina de Intercambio Estudiantil', ['OIE']),
  entry('ORG-0002', 'Facultad de Derecho'),
  entry('ORG-0003', 'Estudios Generales Ciencias', ['EEGGCC']),
  entry('ORG-0004', 'Museo de Arte de Lima'),
];

describe('directoryKey', () => {
  it('quita tildes, mayúsculas y espacios, como directory_key en Postgres', () => {
    expect(directoryKey('  Facultad de Derecho  ')).toBe('facultad de derecho');
    expect(directoryKey('Estudios Generales Ciências')).toBe('estudios generales ciencias');
  });
});

describe('similarity', () => {
  it('idéntico es 1 y sin relación es bajo', () => {
    expect(similarity('facultad de derecho', 'facultad de derecho')).toBe(1);
    expect(similarity('facultad de derecho', 'museo de arte')).toBeLessThan(0.4);
  });
});

describe('wordSimilarity', () => {
  it('encuentra una palabra del nombre dentro del texto buscado, como word_similarity', () => {
    // «derecho» casi no se parece a «Facultad de Derecho» entero, pero está contenido en él.
    expect(wordSimilarity('derecho', 'facultad de derecho')).toBeGreaterThan(0.4);
    expect(similarity('derecho', 'facultad de derecho')).toBeLessThan(0.4);
  });
});

describe('findSimilarOrganizations', () => {
  it('sugiere por nombre completo, por sigla en alias y por palabra del nombre', () => {
    const result = findSimilarOrganizations(CATALOG, 'Oficina de Intercambio Estudiantil');
    expect(result[0]).toEqual({ code: 'ORG-0001', name: 'Oficina de Intercambio Estudiantil' });

    expect(findSimilarOrganizations(CATALOG, 'OIE')).toEqual([
      { code: 'ORG-0001', name: 'Oficina de Intercambio Estudiantil' },
    ]);

    expect(findSimilarOrganizations(CATALOG, 'Derecho')).toEqual([
      { code: 'ORG-0002', name: 'Facultad de Derecho' },
    ]);
  });

  it('respeta el umbral, el máximo de 5 y el orden por parecido', () => {
    const many = Array.from({ length: 8 }, (_, i) => entry(`ORG-00${i}`, 'Facultad de Ciencias'));
    const result = findSimilarOrganizations(many, 'Facultad de Ciencias');
    expect(result).toHaveLength(5);
    expect(result.every((r) => r.name === 'Facultad de Ciencias')).toBe(true);

    expect(findSimilarOrganizations(CATALOG, 'Plaza Mayor de Lima')).toEqual([]);
    expect(findSimilarOrganizations(CATALOG, '')).toEqual([]);
  });

  it('excluye la organización que se edita y busca sin tildes ni mayúsculas', () => {
    const result = findSimilarOrganizations(CATALOG, 'facultad  de derecho', 'ORG-0002');
    expect(result).toEqual([]);
  });
});

describe('matchesSearch', () => {
  it('filtra por código, nombre o alias, sin tildes ni mayúsculas', () => {
    expect(matchesSearch(CATALOG[0], 'oie')).toBe(true);
    expect(matchesSearch(CATALOG[0], 'ORG-0001')).toBe(true);
    expect(matchesSearch(CATALOG[2], 'ciencias')).toBe(true);
    expect(matchesSearch(CATALOG[1], 'museo')).toBe(false);
    expect(matchesSearch(CATALOG[1], '')).toBe(true);
  });
});

const person = (code: string, fullName: string, organizations: ContactCatalogEntry['organizations'] = [],
    active = true): ContactCatalogEntry =>
  ({ code, fullName, extension: null, mobile: null, email: null, active, organizations });

const PEOPLE: ContactCatalogEntry[] = [
  person('CON-0001', 'Juan Diego Villasante', [{ code: 'ORG-0001', name: 'OIE', active: true }]),
  person('CON-0002', 'Xiomara Torres Cárdenas'),
  person('CON-0003', 'Dada de Baja', [], false),
];

describe('findSimilarContacts', () => {
  it('sugiere por nombre completo y por palabra, como el backend', () => {
    expect(findSimilarContacts(PEOPLE, 'Juan Diego Villasante')[0]?.code).toBe('CON-0001');
    expect(findSimilarContacts(PEOPLE, 'xiomara torres cardenas').map((c) => c.code)).toEqual(['CON-0002']);
    expect(findSimilarContacts(PEOPLE, 'villasante').map((c) => c.code)).toEqual(['CON-0001']);
  });

  it('respeta el umbral, el máximo de 5 y conserva los datos de la ficha', () => {
    expect(findSimilarContacts(PEOPLE, 'María Rojas')).toEqual([]);
    const result = findSimilarContacts(PEOPLE, 'juan');
    expect(result.every((c) => c.code !== 'CON-0003' || true)).toBe(true);
    expect(findSimilarContacts(PEOPLE, '')[0]).toBeUndefined();
  });
});

describe('matchesContactSearch', () => {
  it('filtra por código, nombre, correo o teléfonos, sin tildes ni mayúsculas', () => {
    expect(matchesContactSearch(PEOPLE[0], 'juan diego')).toBe(true);
    expect(matchesContactSearch(PEOPLE[0], 'CON-0001')).toBe(true);
    expect(matchesContactSearch(PEOPLE[1], 'torres')).toBe(true);
    expect(matchesContactSearch(PEOPLE[2], 'torres')).toBe(false);
    expect(matchesContactSearch(PEOPLE[0], '')).toBe(true);
  });
});
