import { buildFrequencyPayload, type FormState } from '../buildFrequencyPayload';

const form: FormState = {
  activityTypeItemId: 29,
  regime: 'OUTSOURCED',
  ruleTypeCode: 'ON_DEMAND',
  scope: 'CAMPUS_WIDE',
  fields: {
    bySeasons: false, seasonRows: [], minDays: '', maxDays: '',
    annualCount: '', windowPreset: '', coverageDays: '',
  },
  estimatedDuration: '3', notes: '', isEditing: false,
};

it('una regla para conjuntos no elige ninguno: se asigna en Planificación (SPEC-203 §3.4)', () => {
  const result = buildFrequencyPayload({ ...form, scope: 'BY_SET' });
  expect(result.error).toBeUndefined();
  expect(result.payload).toMatchObject({ scope: 'BY_SET' });
  expect(result.payload).not.toHaveProperty('greenAreaSetId');
});

it('ya no envía el teórico (SPEC-203 D-06)', () => {
  const result = buildFrequencyPayload({ ...form, ruleTypeCode: 'INTERVAL_DAYS',
    fields: { ...form.fields, minDays: '30', maxDays: '35' } });
  expect(result.payload).not.toHaveProperty('targetDaysInterval');
});
