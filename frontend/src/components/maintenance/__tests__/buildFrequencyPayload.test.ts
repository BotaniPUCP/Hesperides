import { buildFrequencyPayload, type FormState } from '../buildFrequencyPayload';

const form: FormState = {
  activityTypeItemId: 29,
  regime: 'OUTSOURCED',
  ruleTypeCode: 'ON_DEMAND',
  scope: 'CAMPUS_WIDE',
  zoneId: null,
  fields: {
    bySeasons: false, seasonRows: [], minDays: '', maxDays: '', targetDays: '',
    annualCount: '', windowPreset: '', coverageDays: '',
  },
  estimatedDuration: '3', notes: '', isEditing: false,
};

it('exige elegir la sección cuando el ámbito es por sección', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'BY_ZONE' });
  expect(result.payload).toBeUndefined();
  expect(result.error).toContain('Selecciona la sección');
});

it('envía la sección elegida en una frecuencia por sección', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'BY_ZONE', zoneId: 7 });
  expect(result.error).toBeUndefined();
  expect(result.payload).toMatchObject({ scope: 'BY_ZONE', zoneId: 7 });
});

it('descarta la zona si el ámbito vuelve a ser todo el campus', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'CAMPUS_WIDE', zoneId: 7 });
  expect(result.payload).toMatchObject({ scope: 'CAMPUS_WIDE', zoneId: null });
});

it('rechaza el ámbito por sector, que aún no se evalúa', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'BY_SECTOR' });
  expect(result.payload).toBeUndefined();
  expect(result.error).toContain('por sector');
});
