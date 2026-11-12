import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../Textarea';

it('associates its label, helper text and required state', () => {
  render(<Textarea id="description" label="Descripción" value="" onChange={jest.fn()} required helperText="Una frase basta" />);
  const field = screen.getByRole('textbox', { name: /Descripción/ });
  expect(field).toHaveAttribute('aria-required', 'true');
  expect(field).toHaveAccessibleDescription('Una frase basta');
  expect(field).toHaveClass('bg-neutral-0', 'text-neutral-900', 'focus:ring-brand-600');
});

it('associates the error instead of help and emits the typed value', async () => {
  const change = jest.fn();
  render(<Textarea id="description" label="Descripción" value="" onChange={change} helperText="Ayuda" errorMessage="Escribe qué pasó" />);
  const field = screen.getByRole('textbox', { name: 'Descripción' });
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(field).toHaveAccessibleDescription('Escribe qué pasó');
  expect(screen.queryByText('Ayuda')).not.toBeInTheDocument();
  await userEvent.type(field, 'R');
  expect(change).toHaveBeenCalledWith('R');
});

it('supports disabled fields and a bounded multiline input', () => {
  render(<Textarea id="description" label="Descripción" value="Rama" onChange={jest.fn()} rows={3} maxLength={10000} disabled />);
  const field = screen.getByRole('textbox');
  expect(field).toBeDisabled();
  expect(field).toHaveAttribute('rows', '3');
  expect(field).toHaveAttribute('maxlength', '10000');
});
