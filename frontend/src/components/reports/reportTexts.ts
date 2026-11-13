import type { ReportTab } from '@/lib/reportNavigation';

/**
 * Every text of the reports in one place (SPEC-202 §2.2 and §7.5). The backend
 * sends codes, never texts (SPEC-C02 §11); translating them is done here.
 */

export const TAB_TEXTS: Record<ReportTab, { label: string; shortLabel: string }> = {
  semanal: { label: 'Semanal del sector', shortLabel: 'Semanal' },
  mensual: { label: 'Mensual de la sección', shortLabel: 'Mensual' },
  direccion: { label: 'Resumen para OSG', shortLabel: 'OSG' },
};

/** Labels of the report badges (SPEC-C01 §3.1, amended by SPEC-202). */
export const BADGE_TEXTS = {
  ON_TARGET: 'En objetivo',
  EARLY: 'Antes del mínimo',
  OVERDUE: 'Fuera de plazo',
  NOT_APPLICABLE: 'No aplica',
  NOT_EVALUABLE: 'No evaluable',
  NO_DATA: 'Sin datos',
  PROVISIONAL: 'Regla provisional',
} as const;

export const CHART_TEXTS = {
  noData: 'Sin datos',
  sectorColumn: 'Sector',
  percentColumn: 'Porcentaje',
  detailColumn: 'Superficie',
  noRecords: 'Sin registros',
  categoryColumn: 'Categoría',
  valueColumn: 'Cantidad',
  monthColumn: 'Mes',
  others: 'Otros',
  target: (value: string) => `meta ${value}`,
  targetShort: 'Meta',
};

export const FILTER_TEXTS = {
  toggle: (count: number) => (count > 0 ? `Filtros (${count})` : 'Filtros'),
  period: 'Periodo',
  currentMonth: 'Mes en curso',
  previousMonth: 'Mes anterior',
  rangeTooLong: 'El periodo no puede superar 366 días',
  sector: 'Sector',
  section: 'Sección',
  team: 'Cuadrilla',
  activityClass: 'Clase de actividad',
  activityType: 'Tipo de actividad',
  all: 'Todos',
  allFemale: 'Todas',
  optionsError: 'No se pudieron cargar los filtros.',
  retry: 'Reintentar',
  invalidUrl: 'Los filtros de la dirección no son válidos y no se consultó el reporte.',
  resetPeriod: 'Volver al periodo por defecto',
};

export const MONTHLY_TEXTS = {
  kpisHeading: 'Indicadores del periodo',
  coverage: 'Cobertura de las áreas verdes',
  coverageRule: 'Una sección cuenta como cubierta si tiene al menos una intervención con aprobación final '
    + 'cuya ejecución cae en el periodo. El porcentaje se pondera por superficie.',
  sectionsOf: (covered: number, total: number) => `${covered} de ${total} secciones`,
  sectionsWithoutArea: (count: number) => `${count} sin superficie registrada: no entran en el porcentaje.`,
  approved: 'Labores aprobadas',
  pendingApproval: 'Ejecutadas pendientes de aprobación',
  pendingApprovalHelp: 'Informativo: no suman a la cobertura hasta su aprobación final.',
  incidents: 'Incidencias',
  incidentsOpen: (open: number, inProgress: number) => `${open + inProgress} abiertas (${inProgress} en atención)`,
  incidentsPending: (count: number) => `${count} pendientes de aprobación`,
  incidentsFlow: (reported: number, resolved: number) => `${reported} registradas y ${resolved} resueltas en el periodo`,
  coverageUnavailable: {
    NO_SECTOR_ASSIGNED: 'Tu cuadrilla no tiene sector asignado; pide a la jefatura que lo registre. '
      + 'Sin sector no se puede medir la cobertura.',
  },
  sectorsTitle: 'Cobertura por sector',
  visualHeading: 'Resumen visual del periodo',
  coverageRing: 'Cobertura del periodo',
  coverageRingCaption: (covered: string, total: string) => `${covered} de ${total}`,
  incidentsDonut: 'Incidencias por estado',
  incidentsDonutTotal: 'incidencias',
  incidentStates: { PENDING_APPROVAL: 'Pendientes de aprobación', OPEN: 'Pendientes de atención', IN_PROGRESS: 'En atención', RESOLVED: 'Resueltas en el periodo' },
  complianceDonut: 'Cumplimiento de frecuencias',
  complianceDonutCaption: 'Lugares evaluados en todas las actividades',
  complianceDonutTotal: 'lugares',
  worksDonut: 'Labores aprobadas por sector',
  worksDonutTotal: 'labores',
  noSections: 'Tu filtro no encontró secciones',
  noSectionsHelp: 'Prueba con otro sector, sección o periodo.',
  noWork: 'No hay trabajo aprobado en este periodo',
  noWorkHelp: 'La cobertura cambia en cuanto se aprueba una intervención ejecutada en el periodo.',
  noOwnTeam: 'Mantenimiento tercerizado o a demanda: su trabajo aún no se registra en el sistema.',
  notFound: 'El sector, la sección o la cuadrilla del filtro no existe o no está a tu alcance.',
  error: 'No se pudo cargar el reporte mensual.',
};

export const COMPLIANCE_TEXTS = {
  title: 'Cumplimiento de frecuencias por actividad',
  activity: 'Actividad',
  status: 'Estado por lugar',
  overdueTargets: 'Lugares fuera de plazo',
  noPlaces: 'Sin lugares atendidos en el periodo',
  empty: 'No hay frecuencias configuradas para estas actividades.',
  teamDoesNotApply: 'El filtro de cuadrilla no aplica al cumplimiento: la ejecución por lugar no registra la cuadrilla.',
  notEvaluable: {
    OUTSOURCED: 'Tercerizado: su ejecución no se registra por lugar.',
  },
  lastExecution: (date: string) => `última ejecución el ${date}`,
};

export const SECTION_LIST_TEXTS = {
  mostAttended: 'Secciones más atendidas',
  unattended: 'Secciones sin atención en el periodo',
  section: 'Sección',
  sector: 'Sector',
  area: 'Superficie',
  works: 'Labores',
  lastAttended: 'Última atención',
  never: 'Sin registro',
  showing: (shown: number, total: number) => `Se muestran ${shown} de ${total}.`,
  emptyMost: 'Ninguna sección recibió trabajo aprobado en el periodo.',
  emptyUnattended: 'Todas las secciones del filtro recibieron atención.',
};

export const SCREEN_TEXTS = {
  title: 'Reportes',
  tablistLabel: 'Reportes',
  supervisorNotice: 'Datos de tus cuadrillas.',
  showing: (tab: ReportTab) => `Mostrando ${TAB_TEXTS[tab].label}`,
  noAccessTitle: 'No tienes acceso a los reportes',
  noAccessDescription: 'Los reportes están disponibles para administración, coordinación y capataces.',
};

/** The demonstration switch: the figures come from the JSON files of components/reports/demo. */
export const DEMO_TEXTS = {
  turnOn: 'Ver con datos de demostración',
  turnOff: 'Volver a los datos reales',
  banner: 'Datos de demostración: las cifras son de ejemplo y no salen del sistema.',
};
