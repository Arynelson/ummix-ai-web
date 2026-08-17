import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocationSelector } from './LocationSelector';

const options = [
  {
    cityId: 'f8c964d8-3f74-49ff-83fe-6e23421ee884',
    cityName: 'Goiânia',
    stateUf: 'GO',
  },
  {
    cityId: '3d7201b0-78f9-4b40-b15c-9f9704527964',
    cityName: 'Anápolis',
    stateUf: 'GO',
  },
];

describe('LocationSelector', () => {
  it('supports selecting more than one city and confirming the selection', () => {
    const onToggle = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <LocationSelector
        options={options}
        selectedIds={[]}
        disabled={false}
        onToggle={onToggle}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: /Confirmar praças/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Goiânia/GO' }));
    expect(onToggle).toHaveBeenCalledWith(options[0]!.cityId);

    rerender(
      <LocationSelector
        options={options}
        selectedIds={options.map((option) => option.cityId)}
        disabled={false}
        onToggle={onToggle}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: 'Goiânia/GO' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /Confirmar praças/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
