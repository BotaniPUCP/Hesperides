import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Iniciar sesión · Hesperides',
};

export default function LoginPage() {
  return (
    // Ancho completo con padding en móvil; tarjeta centrada de 400px máximo
    // en tablet y escritorio (SPEC-001 §7.1).
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-[400px]">
        <LoginForm />
      </div>
    </main>
  );
}
