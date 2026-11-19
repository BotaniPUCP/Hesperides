import { ApiError } from '../api';
import { interventionError } from '../interventions-api';

describe('interventionError', () => {
  it('cada conflicto dice cuál fue, en vez de un aviso único', () => {
    expect(interventionError(new ApiError(409, 'Evidence bytes cannot be replaced'))).toMatch(/ya se subió/);
    expect(interventionError(new ApiError(409, 'Submission is in progress'))).toMatch(/se está procesando/);
  });

  it('un conflicto aún sin mensaje propio conserva el aviso general', () => {
    expect(interventionError(new ApiError(409, 'Some future conflict'))).toMatch(/El trabajo cambió o hay un envío en curso/);
  });

  it('traduce los mensajes con dato y conserva el dato', () => {
    expect(interventionError(new ApiError(422, 'Specimen is not part of this location: EV-000123'))).toBe('El ejemplar EV-000123 no pertenece a esta ubicación.');
    expect(interventionError(new ApiError(422, 'Inactive activity catalog reference'))).toMatch(/ya no está disponible/);
  });

  it('una regla de intervenciones ya no termina en el mensaje genérico', () => {
    expect(interventionError(new ApiError(422, 'Finding requires a report source'))).toBe('Un hallazgo necesita indicar quién lo reportó.');
  });
});
