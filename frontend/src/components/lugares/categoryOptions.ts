import type { CatalogItem } from '@shared/types';
import type { SelectOption } from '@/components/ui';

const collator = new Intl.Collator('es', { sensitivity: 'base' });

/**
 * Las categorías de lugar en orden alfabético: son 24 y se buscan por nombre.
 * Con el collator en español, «Área verde» va junto a «Auditorio» y no al final.
 */
export function categoryOptions(items: CatalogItem[]): SelectOption[] {
  return [...items]
    .sort((a, b) => collator.compare(a.label, b.label))
    .map((c, i) => ({ id: i + 1, code: c.code, label: c.label }));
}
