import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionsBar } from '../BulkActionsBar';

describe('BulkActionsBar', () => {
  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionsBar
        selectedCount={0}
        onClearSelection={jest.fn()}
        onDeactivate={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders counter and buttons when items are selected', async () => {
    const user = userEvent.setup();
    const onClear = jest.fn();
    const onDeactivate = jest.fn();

    render(
      <BulkActionsBar
        selectedCount={3}
        onClearSelection={onClear}
        onDeactivate={onDeactivate}
      />,
    );

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('3 ejemplares seleccionados')).toBeInTheDocument();
    expect(screen.queryByText(/listos para retiro/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Desmarcar todos/i }));
    expect(onClear).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Dar de baja seleccionados/i }));
    expect(onDeactivate).toHaveBeenCalledTimes(1);
  });
});
