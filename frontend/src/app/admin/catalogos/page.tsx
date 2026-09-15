import { RouteGuard } from '@/components/auth/RouteGuard';
import { CatalogsAdminScreen } from '@/components/catalogs/CatalogsAdminScreen';

export const metadata = {
  title: 'Catálogos · Hesperides',
};

export default function CatalogosPage() {
  return (
    // El guard exige sesión; que solo ADMIN pueda leer y escribir catálogos lo
    // impone el backend, que responde 403 al resto (SPEC-003 §4).
    <RouteGuard>
      <main className="min-h-screen bg-neutral-50 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <CatalogsAdminScreen />
        </div>
      </main>
    </RouteGuard>
  );
}
