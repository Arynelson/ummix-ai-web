import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CampaignState } from '../types';
import { CampaignSummary } from './CampaignSummary';
import { ChannelComparison } from './ChannelComparison';

const state: CampaignState = {
  productService: 'Clínica de estética',
  objective: 'reconhecimento_marca',
  audienceDescription: 'Mulheres de 30 a 50 anos',
  location: {
    cityId: '5a5b4510-275c-40af-a2cb-e853bd680d98',
    cityName: 'Goiânia',
    stateUf: 'GO',
  },
  locations: [
    {
      cityId: '5a5b4510-275c-40af-a2cb-e853bd680d98',
      cityName: 'Goiânia',
      stateUf: 'GO',
    },
  ],
  locationOptions: [],
  unresolvedLocation: null,
  maximumBudget: 5000,
  desiredStartDate: '2026-08-15',
  selectedChannel: null,
  category: 'saude_estetica',
  brandStrength: 'regional',
  durationSeconds: 15,
  comparison: null,
  minimumInvestment: 100,
};

describe('CampaignSummary', () => {
  it('shows the hard budget cap and collected context', () => {
    render(<CampaignSummary state={state} />);
    expect(screen.getByText('Clínica de estética')).toBeInTheDocument();
    expect(screen.getByText('Goiânia/GO')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('Mulheres de 30 a 50 anos')).toBeInTheDocument();
  });
});

describe('ChannelComparison', () => {
  it('keeps channel selection explicit', () => {
    const onSelect = vi.fn();
    const radio = {
      channel: 'radio' as const,
      available: true,
      cpm: 20,
      frequency: 4,
      periodWeeks: 2,
      totalImpressions: 250000,
      inventory: 62500,
      audienceImpacts: 8000,
      projectedLeads: 40,
      projectedSales: 4,
      reasonUnavailable: null,
    };
    render(
      <ChannelComparison
        comparison={{
          radio,
          tv: { ...radio, channel: 'tv', cpm: 30, totalImpressions: 166667 },
          recommendedChannel: 'radio',
          rationale: 'Rádio oferece mais impressões.',
        }}
        selectedChannel={null}
        onSelect={onSelect}
        disabled={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Rádio/i }));
    expect(onSelect).toHaveBeenCalledWith('Rádio');
  });
});
