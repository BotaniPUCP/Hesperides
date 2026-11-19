import type { ActivationGap, ClosureBlocker } from '@shared/types';
import { ACTIVATION_GAPS, CLOSURE_BLOCKERS } from './incidentLabels';
import type { MessagePattern } from './placeErrorMessages';

/** Errores del módulo de incidencias (SPEC-201, rediseño), en español. */
export const INCIDENT_MESSAGES: Record<string, string> = {
  'Incident already closed': 'La incidencia ya está cerrada.',
  'Incident already closed with another summary': 'La incidencia ya se cerró con otra solución aplicada.',
  'Activate the incident before linking work': 'Activa la incidencia antes de vincularle intervenciones.',
  'Invalid zone': 'La sección elegida no existe.',
  'Invalid contact': 'El contacto elegido no está en el Directorio.',
  'Invalid organization': 'La organización elegida no está en el Directorio.',
  'Requester required': 'Indica quién pidió la atención.',
  'Requested for must differ from requested by': '«Para» debe ser una organización distinta de «Pedido de».',
  'Provider must be an external company': 'El tercero debe ser una empresa externa del Directorio.',
  'Invalid height class': 'La clase de altura no es válida.',
};

/** El backend lista los códigos de lo que falta; se traducen con los textos de la pantalla. */
export const INCIDENT_PATTERNS: readonly MessagePattern[] = [
  [/^Incident cannot be activated yet: \[?(.*?)\]?$/, (m) =>
    `Falta para activar: ${codes(m[1]).map((c) => ACTIVATION_GAPS[c as ActivationGap] ?? c).join(', ')}.`],
  [/^Incident cannot be closed yet: \[?(.*?)\]?$/, (m) =>
    codes(m[1]).map((c) => CLOSURE_BLOCKERS[c as ClosureBlocker] ?? c).join(' ')],
];

function codes(list: string): string[] {
  return list.split(',').map((c) => c.trim()).filter(Boolean);
}
