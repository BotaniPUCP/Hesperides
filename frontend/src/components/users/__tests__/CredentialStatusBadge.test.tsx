import { render, screen } from '@testing-library/react';
import { CredentialStatusBadge } from '../CredentialStatusBadge';

describe('CredentialStatusBadge', () => {
  it('muestra la entrega pendiente como advertencia, no como algo normal', () => {
    render(<CredentialStatusBadge status="PENDING_DELIVERY" />);

    // Es el estado que exige una accion del administrador: el correo reboto y
    // esa persona no puede entrar hasta que alguien lo resuelva (SPEC-100 §2.6).
    expect(screen.getByText('Entrega pendiente')).toBeInTheDocument();
  });

  it('muestra la entrega realizada', () => {
    render(<CredentialStatusBadge status="DELIVERED" />);

    expect(screen.getByText('Credenciales enviadas')).toBeInTheDocument();
  });

  it('distingue visualmente los dos estados', () => {
    const { container: pendiente } = render(<CredentialStatusBadge status="PENDING_DELIVERY" />);
    const { container: entregado } = render(<CredentialStatusBadge status="DELIVERED" />);

    expect(pendiente.innerHTML).not.toEqual(entregado.innerHTML);
  });
});
