import type { Reservation } from '@shared/types';

/** Una reserva próxima de prueba; cada test cambia solo lo que mira. */
export function reservationFixture(patch: Partial<Reservation> = {}): Reservation {
  return {
    code: 'RES-0001',
    place: { id: 25, code: 'LUG-0025', name: 'Jardín Rosales', sectionCodes: ['AV-0151'] },
    requestedBy: { code: 'ORG-0012', name: 'Oficina de Intercambio Estudiantil' },
    requester: { code: 'CON-0007', fullName: 'Juan Pablo', role: null, mobile: '957351795', extension: null },
    requestedFor: null,
    responsible: { code: 'CON-0007', fullName: 'Juan Pablo', role: null, mobile: '957351795', extension: null },
    responsibleHistory: [],
    confirmationHistory: [],
    usageHistory: [],
    startsAt: '2026-11-13T09:00:00-05:00',
    endsAt: '2026-11-13T11:00:00-05:00',
    purpose: null,
    state: 'UPCOMING',
    cancelReason: null,
    useConfirmed: false,
    spaceUsed: false,
    usageState: 'NOT_RECORDED',
    canConfirm: true,
    canRecordUsage: false,
    version: 0,
    warnings: [],
    ...patch,
  };
}
