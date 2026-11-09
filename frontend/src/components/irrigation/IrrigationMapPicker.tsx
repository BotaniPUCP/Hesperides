'use client';

import { SectionMapPicker, type SectionMapPickerProps, type SectionPickerTexts } from '@/components/map3d/SectionMapPicker';

const IRRIGATION_TEXTS: SectionPickerTexts = {
  title: 'Seleccionar secciones de riego · Mapa 3D',
  description: 'Selecciona una o varias secciones, por sector o en conjunto. Confirmar no guarda aún en la base.',
  listTitle: 'Áreas regadas',
  confirmAllPrompt: (missing) =>
    `¿Confirmas marcar ${missing} secciones adicionales como regadas? Esta operación solo selecciona: no guarda el turno.`,
};

/** El selector de secciones del mapa con los textos de Riego. */
export function IrrigationMapPicker(props: Omit<SectionMapPickerProps, 'texts'>) {
  return <SectionMapPicker {...props} texts={IRRIGATION_TEXTS} />;
}
