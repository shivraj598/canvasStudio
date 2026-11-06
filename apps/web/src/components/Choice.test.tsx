import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CheckboxCards, RadioCards } from './Choice';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana', description: 'Yellow' },
  { value: 'c', label: 'Cherry', disabled: true },
] as const;

describe('RadioCards', () => {
  it('selects a single option', async () => {
    const onChange = vi.fn();
    render(
      <RadioCards
        name="fruit"
        legend="Fruit"
        options={[...options]}
        value="a"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('group', { name: 'Fruit' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Apple' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Banana/ }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('shows errors', () => {
    render(
      <RadioCards
        name="fruit"
        legend="Fruit"
        options={[...options]}
        value={undefined}
        onChange={() => {}}
        error="Pick one"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Pick one');
  });
});

describe('CheckboxCards', () => {
  it('toggles options and keeps them in option order', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CheckboxCards legend="Fruit" options={[...options]} value={['b']} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Apple' }));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);

    rerender(
      <CheckboxCards
        legend="Fruit"
        options={[...options]}
        value={['a', 'b']}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Banana/ }));
    expect(onChange).toHaveBeenLastCalledWith(['a']);
  });

  it('does not toggle disabled options', async () => {
    const onChange = vi.fn();
    render(<CheckboxCards legend="Fruit" options={[...options]} value={[]} onChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: 'Cherry' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Cherry' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
