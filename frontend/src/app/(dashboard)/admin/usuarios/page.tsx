import { UsersAdminScreen } from '@/components/users/UsersAdminScreen';

export const metadata = {
  title: 'Usuarios · Hesperides',
};

// El guard y el sidebar los pone el layout de (dashboard). El alcance por rol lo
// resuelve la pantalla, que distingue entre quien puede leer el listado y quien
// además puede escribir (Anexo A de SPEC-001).
export default function UsuariosPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <UsersAdminScreen />
    </div>
  );
}
