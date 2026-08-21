import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AudienceClarification } from './AudienceClarification';

describe('AudienceClarification', () => {
  it('shows the two catalog-based alternatives and returns the selected id', () => {
    const onSelect = vi.fn();
    render(
      <AudienceClarification
        clarification={{
          prompt: 'Qual público representa melhor sua campanha?',
          options: [
            {
              id: 'audience-a',
              label: 'Mulheres adultas',
              filters: [
                { questionId: 'gender', question: 'Gênero', optionId: 'female', option: 'Feminino' },
              ],
            },
            {
              id: 'audience-b',
              label: 'Público amplo',
              filters: [],
            },
          ],
        }}
        disabled={false}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText('Mulheres adultas')).toBeInTheDocument();
    expect(screen.getByText('Gênero: Feminino')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Público amplo/i }));
    expect(onSelect).toHaveBeenCalledWith('audience-b');
  });
});
