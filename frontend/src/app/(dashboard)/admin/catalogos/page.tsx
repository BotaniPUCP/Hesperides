import { CatalogsAdminScreen } from '@/components/catalogs/CatalogsAdminScreen';

export const metadata = {
  title: 'Catálogos · Hesperides',
};

// Que solo ADMIN pueda leer y escribir catálogos lo impone el backend, que
// responde 403 al resto (SPEC-003 §4). El sidebar además oculta el enlace.
export default function CatalogosPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <CatalogsAdminScreen />
    </div>
  );
}
