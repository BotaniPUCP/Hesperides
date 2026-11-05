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

export const SCREEN_TEXTS = {
  title: 'Reportes',
  breadcrumbHome: 'Inicio',
  tablistLabel: 'Reportes',
  supervisorNotice: 'Datos de tus cuadrillas.',
  showing: (tab: ReportTab) => `Mostrando ${TAB_TEXTS[tab].label}`,
  noAccessTitle: 'No tienes acceso a los reportes',
  noAccessDescription: 'Los reportes están disponibles para administración, coordinación y capataces.',
  comingSoonTitle: 'Próximamente',
  comingSoonDescription: 'Esta pestaña llega en la siguiente entrega.',
};
