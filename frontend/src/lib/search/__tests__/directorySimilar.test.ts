import type { ContactSummary, OrganizationSummary } from '@shared/types';
import { similarContacts, similarOrganizations } from '../directorySimilar';

const org = (code: string, name: string, aliases: string[] = []): OrganizationSummary => ({
  code, name, aliases, type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, phone: null, contactCount: 0, searchKey: '',
});
const contact = (code: string, fullName: string): ContactSummary => ({
  code, fullName, extension: null, mobile: null, email: null, organizations: [], searchKey: '',
});

describe('similarOrganizations (lo que hacía ORGANIZATION_SIMILAR)', () => {
  const list = [
    org('ORG-1', 'Facultad de Derecho'),
    org('ORG-2', 'Estudios Generales Ciencias', ['EEGGCC']),
    org('ORG-3', 'DAF'),
  ];

  it('sugiere una casi igual, sin tildes ni mayúsculas', () => {
    expect(similarOrganizations(list, 'estudios generales ciéncia')).toEqual([{ code: 'ORG-2', name: 'Estudios Generales Ciencias' }]);
  });

  it('sugiere la que contiene la palabra escrita (word_similarity)', () => {
    expect(similarOrganizations(list, 'derecho').map((o) => o.code)).toEqual(['ORG-1']);
  });

  it('sugiere por alias', () => {
    expect(similarOrganizations(list, 'eeggcc').map((o) => o.code)).toEqual(['ORG-2']);
  });

  it('no sugiere por debajo del umbral: EEGGCC y DAF no se parecen', () => {
    expect(similarOrganizations(list, 'daf').map((o) => o.code)).toEqual(['ORG-3']);
  });

  it('ordena de la más parecida a la menos y corta en cinco', () => {
    const many = Array.from({ length: 7 }, (_, i) => org(`O-${i}`, `Jardin ${'x'.repeat(i)}`));
    const found = similarOrganizations(many, 'jardin');
    expect(found).toHaveLength(5);
    expect(found[0].code).toBe('O-0');
  });

  it('un texto vacío no sugiere nada', () => {
    expect(similarOrganizations(list, '   ')).toEqual([]);
  });
});

describe('similarContacts (lo que hacía CONTACT_SIMILAR)', () => {
  const list = [contact('CON-1', 'Juan Diego Villasante'), contact('CON-2', 'Ana Torres')];

  it('sugiere al mismo nombre de cualquier organización', () => {
    expect(similarContacts(list, 'juan diego villasante').map((c) => c.code)).toEqual(['CON-1']);
  });

  it('no sugiere nombres distintos', () => {
    expect(similarContacts(list, 'pedro castillo')).toEqual([]);
  });
});
