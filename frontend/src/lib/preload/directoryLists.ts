import type { ContactSummary, OrganizationSummary } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { definePreloadedList, IMPORT_CONFIRMED } from './preloadedList';

/** Lo que cambia el Directorio: sus propias escrituras y las importaciones (SPEC-119 D-03). */
const DIRECTORY_WRITES = [/^\/directory\//, IMPORT_CONFIRMED];

export const organizationsList = definePreloadedList<OrganizationSummary>(
  'organizations', () => directoryApi.allOrganizations(), DIRECTORY_WRITES);

export const contactsList = definePreloadedList<ContactSummary>(
  'contacts', () => directoryApi.allContacts(), DIRECTORY_WRITES);
