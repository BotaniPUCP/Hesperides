import type { ContactSummary, OrganizationRef, OrganizationSummary } from '@shared/types';
import { normalize } from '@/lib/search/searchText';

/** Filas como las de `/directory/…/all`: el `searchKey` se arma como lo arma el backend (SPEC-119). */

const UNIT = { code: 'PUCP_UNIT', label: 'Unidad PUCP' };
const COMPANY = { code: 'EXTERNAL_COMPANY', label: 'Empresa externa' };

export function organization(code: string, name: string,
  extra: Partial<Omit<OrganizationSummary, 'code' | 'name' | 'searchKey'>> & { company?: boolean } = {}): OrganizationSummary {
  const { company, ...rest } = extra;
  const aliases = rest.aliases ?? [];
  return {
    code, name, type: company ? COMPANY : UNIT, phone: null, contactCount: 0, aliases, ...rest,
    searchKey: normalize([code, name, ...aliases].join(' ')),
  };
}

export function contact(code: string, fullName: string, organizations: OrganizationRef[] = [],
  extra: Partial<Pick<ContactSummary, 'extension' | 'mobile' | 'email' | 'active'>> = {}): ContactSummary {
  const { active = true, ...rest } = extra;
  const fields = { extension: null, mobile: null, email: null, ...rest };
  return {
    code, fullName, organizations, active, ...fields,
    searchKey: normalize([code, fullName, fields.email, fields.extension, fields.mobile].filter(Boolean).join(' ')),
  };
}
