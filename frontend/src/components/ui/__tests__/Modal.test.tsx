import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('no renderiza nada cuando esta cerrado', () => {
    render(<Modal isOpen={false} onClose={jest.fn()} title="Confirmar"><p>Contenido</p></Modal>);
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('renderiza titulo y contenido cuando esta abierto', () => {
    render(<Modal isOpen onClose={jest.fn()} title="Confirmar"><p>Contenido</p></Modal>);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('se anuncia con su titulo mediante aria-labelledby', () => {
    render(<Modal isOpen onClose={jest.fn()} title="Confirmar"><p>x</p></Modal>);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Confirmar');
  });

  it('cierra con Escape', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar"><p>x</p></Modal>);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra con Escape si closeOnEsc es false', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar" closeOnEsc={false}><p>x</p></Modal>);

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('cierra al pulsar el overlay', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar"><p>x</p></Modal>);

    await userEvent.click(screen.getByTestId('modal-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra al pulsar dentro del contenido', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar"><p>Contenido</p></Modal>);

    await userEvent.click(screen.getByText('Contenido'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('no cierra por overlay si closeOnOverlayClick es false', async () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirmar" closeOnOverlayClick={false}><p>x</p></Modal>,
    );

    await userEvent.click(screen.getByTestId('modal-overlay'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('atrapa el foco: Tab desde el ultimo elemento vuelve al primero', async () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="Confirmar" footer={<button>Aceptar</button>}>
        <button>Interno</button>
      </Modal>,
    );

    const cerrar = screen.getByRole('button', { name: 'Cerrar' });
    const aceptar = screen.getByRole('button', { name: 'Aceptar' });

    aceptar.focus();
    await userEvent.tab();

    expect(cerrar).toHaveFocus();
  });

  it('renderiza el pie cuando se le pasa', () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="Confirmar" footer={<button>Aceptar</button>}>
        <p>x</p>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
  });
});
