import type { Species, SpecimenListItem } from '@shared/types';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { definePreloadedList, IMPORT_CONFIRMED } from './preloadedList';

/**
 * Registrar o cambiar un ejemplar también cambia su especie (cuántos ejemplares tiene, su foto),
 * y cambiar una especie cambia los ejemplares que la muestran (SPEC-119 D-03).
 */
const INVENTORY_WRITES = [/^\/green-inventory\/(species|specimens)(\/|$)/, IMPORT_CONFIRMED];

export const speciesList = definePreloadedList<Species>(
  'species', () => inventarioVerdeApi.allSpecies(), INVENTORY_WRITES);

export const specimensList = definePreloadedList<SpecimenListItem>(
  'specimens', () => inventarioVerdeApi.allSpecimens(), INVENTORY_WRITES);
