import type { DirectionIndicatorCode, IndicatorTargetReason, IndicatorUnavailableReason } from '@shared/types';

/** Texts of the summary for the direction (SPEC-202 §5.1 step 4, §7.1). The backend sends codes. */
export const DIRECTION_TEXTS = {
  month: 'Mes',
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  partial: 'Mes en curso: cifras parciales',
  headerHeading: 'El campus en cifras',
  greenArea: 'Áreas verdes registradas',
  campus: 'Superficie del campus',
  sections: 'Secciones',
  activeTeams: 'Cuadrillas activas',
  hectares: (value: string) => `${value} ha`,
  gaugesHeading: 'Metas del mes',
  gaugeCoverage: 'Cobertura',
  gaugeIrrigation: 'Riego',
  trendTitle: 'Cobertura de los últimos 6 meses',
  indicatorsHeading: 'Indicadores de gestión',
  target: (value: string) => `Meta: ${value}`,
  previous: (value: string, month: string) => `${month}: ${value}`,
  versus: (delta: string, unit: 'PERCENT' | 'COUNT', month: string) =>
    `${delta}${unit === 'PERCENT' ? ' pts' : ''} frente a ${month}`,
  noPrevious: 'Sin registros el mes anterior',
  error: 'No se pudo cargar el resumen.',
  invalid: 'El mes de la dirección no es válido y no se consultó el resumen.',
  resetMonth: 'Ir al último mes cerrado',
};

export const INDICATOR_TEXTS: Record<DirectionIndicatorCode, { label: string; description: string }> = {
  COVERAGE: { label: 'Cobertura de las áreas verdes', description: 'Superficie con mantenimiento aprobado en el mes.' },
  IRRIGATION_COVERAGE: { label: 'Cobertura de riego', description: 'Superficie regada al menos una vez en el mes.' },
  APPROVED_INTERVENTIONS: { label: 'Labores aprobadas', description: 'Intervenciones con aprobación final en el mes.' },
  RESOLVED_INCIDENTS: { label: 'Incidencias resueltas', description: 'Incidencias cerradas en el mes.' },
  TREE_INVENTORY: { label: 'Arbolado en el catastro', description: 'Árboles y palmeras registrados al cierre del mes.' },
  IRRIGATION_CYCLES: { label: 'Ciclos de riego completos', description: 'Vueltas completas de riego por sector.' },
  PHYTOSANITARY_CONTROLS: { label: 'Controles fitosanitarios del año', description: 'Campañas de control en todo el campus.' },
  MAJOR_PRUNING: { label: 'Poda mayor del año', description: 'Poda de altura ejecutada por terceros.' },
  HIGH_URGENCY_ON_TIME: { label: 'Urgencias altas atendidas en plazo', description: 'Incidencias de urgencia alta cerradas dentro del plazo.' },
};

export const UNAVAILABLE_TEXTS: Record<IndicatorUnavailableReason, string> = {
  RULE_NOT_DEFINED: 'Falta definir qué es un ciclo de riego completo.',
  UNIT_NOT_MODELED: 'Un control fitosanitario aún no se registra como unidad en el sistema.',
  NOT_RECORDED: 'La ejecuta un tercero y su ejecución no se registra.',
  NO_DEADLINES_CONFIGURED: 'Los plazos de atención por urgencia aún no están confirmados.',
};

export const TARGET_REASON_TEXTS: Record<IndicatorTargetReason, string> = {
  NO_TARGET: 'Sin meta: más o menos no es mejor ni peor por sí mismo.',
  TARGET_NOT_STORED: 'Meta no registrada en el sistema.',
};
