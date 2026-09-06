export interface CatalogType {
  id: number;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

export interface CatalogItem {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}
