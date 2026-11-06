import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarLink } from '../SidebarLink';
import { previousPath, recordVisit, restartTrail } from '@/lib/navigationTrail';

it('entrar a un módulo por el menú no deja a dónde volver y avisa para cerrar el panel', async () => {
  restartTrail('/inicio');
  recordVisit('/especie');
  const onNavigate = jest.fn();
  render(<SidebarLink href="/lista" label="Lista" icon="L" active={false} onNavigate={onNavigate} />);

  const link = screen.getByRole('link', { name: /Lista/ });
  link.addEventListener('click', (event) => event.preventDefault());
  await userEvent.click(link);

  expect(previousPath()).toBeNull();
  expect(onNavigate).toHaveBeenCalled();
});
