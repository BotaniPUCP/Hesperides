import { render, screen } from '@testing-library/react';
import { useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { Providers } from '../providers';

function Sonda() {
  // Si los providers no están montados, estos hooks lanzan.
  const { isLoading } = useAuth();
  const { showToast } = useToast();
  return <p>{`listo:${typeof showToast === 'function'}:${isLoading}`}</p>;
}

describe('Providers', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, message: 'Invalid or expired token', data: null }),
    }) as unknown as typeof fetch;
  });

  it('expone la sesion y los toasts a los componentes hijos', () => {
    render(
      <Providers>
        <Sonda />
      </Providers>,
    );

    expect(screen.getByText(/listo:true/)).toBeInTheDocument();
  });
});
