import {
  addDays, dayHeading, formatSchedule, isoFromInput, inputFromIso, reservationDay, stateLabel,
  usageLabel,
} from '../reservation-format';

describe('reservation-format', () => {
  it('la fecha de la API ya está en hora de Lima y se toma literal', () => {
    expect(reservationDay('2026-11-13T23:00:00-05:00')).toBe('2026-11-13');
    expect(inputFromIso('2026-11-13T10:00:00-05:00')).toBe('2026-11-13T10:00');
    expect(isoFromInput('2026-11-13T10:00')).toBe('2026-11-13T10:00:00-05:00');
  });

  it('suma días del calendario sin saltar por zonas horarias', () => {
    expect(addDays('2026-11-13', 1)).toBe('2026-11-14');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('muestra un horario corto o el rango completo si abarca varios días', () => {
    expect(formatSchedule('2026-11-13T10:00:00-05:00', '2026-11-13T14:00:00-05:00'))
      .toBe('10:00–14:00');
    expect(formatSchedule('2026-11-13T23:00:00-05:00', '2026-11-14T01:00:00-05:00'))
      .toContain('–');
    expect(formatSchedule('2026-11-13T23:00:00-05:00', '2026-11-14T01:00:00-05:00'))
      .toContain('23:00');
    expect(formatSchedule('2026-11-13T23:00:00-05:00', '2026-11-14T01:00:00-05:00'))
      .toContain('01:00');
  });

  it('encabeza la agenda con Hoy y Mañana, y con la fecha en otro día', () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
    expect(dayHeading(today)).toBe('Hoy');
    expect(dayHeading(addDays(today, 1))).toBe('Mañana');
    expect(dayHeading(addDays(today, 3))).not.toBe('Hoy');
  });

  it('nombra los estados tal como los lee la persona', () => {
    expect(stateLabel('UPCOMING')).toBe('Próxima');
    expect(stateLabel('IN_PROGRESS')).toBe('En curso');
    expect(stateLabel('FINISHED')).toBe('Terminada');
    expect(stateLabel('CANCELLED')).toBe('Anulada');
  });

  it('nombra el uso del espacio tal como lo lee la persona (enmienda 11 nov 2026)', () => {
    expect(usageLabel('NOT_RECORDED')).toBe('Sin uso registrado');
    expect(usageLabel('IN_USE')).toBe('En uso');
    expect(usageLabel('NOT_IN_USE')).toBe('No se está usando');
    expect(usageLabel('USED')).toBe('Usada');
    expect(usageLabel('NOT_USED')).toBe('No usada');
  });
});
