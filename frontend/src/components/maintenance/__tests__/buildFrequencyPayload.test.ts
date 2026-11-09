import { buildFrequencyPayload, type FormState } from '../buildFrequencyPayload';

const form: FormState = {
  activityTypeItemId: 29,
  regime: 'OUTSOURCED',
  ruleTypeCode: 'ON_DEMAND',
  scope: 'CAMPUS_WIDE',
  greenAreaSetId: null,
  fields: {
    bySeasons: false, seasonRows: [], minDays: '', maxDays: '',
    annualCount: '', windowPreset: '', coverageDays: '',
  },
  estimatedDuration: '3', notes: '', isEditing: false,
};

it('exige elegir el conjunto cuando la frecuencia es propia de un conjunto (SPEC-203 D-07)', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'BY_SET' });
  expect(result.payload).toBeUndefined();
  expect(result.error).toContain('Elige el conjunto');
});

it('envía el conjunto elegido en una frecuencia propia', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'BY_SET', greenAreaSetId: 7 });
  expect(result.error).toBeUndefined();
  expect(result.payload).toMatchObject({ scope: 'BY_SET', greenAreaSetId: 7 });
});

it('descarta el conjunto si la frecuencia vuelve a ser de todo el campus', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'CAMPUS_WIDE', greenAreaSetId: 7 });
  expect(result.payload).toMatchObject({ scope: 'CAMPUS_WIDE', greenAreaSetId: null });
});

it('ya no envía el teórico (SPEC-203 D-06)', () => {
  const result = buildFrequencyPayload({ ...form, ruleTypeCode: 'INTERVAL_DAYS',
    fields: { ...form.fields, minDays: '30', maxDays: '35' } });
  expect(result.payload).not.toHaveProperty('targetDaysInterval');
});
