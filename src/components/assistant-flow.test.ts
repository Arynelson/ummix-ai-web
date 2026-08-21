import { describe, expect, it } from 'vitest';
import {
  assistantInputPlaceholder,
  shouldShowAudienceClarification,
  shouldShowChannelComparison,
  shouldShowLocationSelector,
} from './assistant-flow';
import type { SessionView } from '../types';

const location = { cityId: 'city', cityName: 'Goiânia', stateUf: 'GO' };
const state = {
  locationOptions: [location],
  comparison: {
    radio: { channel: 'radio' as const, available: true },
    tv: { channel: 'tv' as const, available: true },
  },
} as SessionView['state'];

describe('assistant flow card gating', () => {
  it('does not show the city card beside an earlier question', () => {
    expect(
      shouldShowLocationSelector({
        missingFields: ['productService', 'location'],
        state,
      }),
    ).toBe(false);
    expect(
      shouldShowLocationSelector({
        missingFields: ['location', 'objective'],
        state,
      }),
    ).toBe(true);
  });

  it('does not show the channel comparison before the last decision', () => {
    expect(
      shouldShowChannelComparison({
        missingFields: ['audienceDescription', 'selectedChannel'],
        state,
      }),
    ).toBe(false);
    expect(
      shouldShowChannelComparison({
        missingFields: ['selectedChannel'],
        state,
      }),
    ).toBe(true);
  });

  it.each([
    ['objective', 'Ex.: Quero fortalecer minha marca'],
    ['audienceDescription', 'Ex.: Empresários e profissionais liberais interessados em tecnologia'],
    ['maximumBudget', 'Ex.: 5000'],
    ['desiredStartDate', 'Ex.: O mais rápido possível'],
    ['selectedChannel', 'Escolha Rádio ou TV na comparação acima'],
  ])('uses a contextual placeholder for %s', (field, expected) => {
    expect(assistantInputPlaceholder({
      missingFields: [field],
      state,
    })).toBe(expected);
  });

  it('asks for a brand name in the product placeholder after brand recognition', () => {
    expect(assistantInputPlaceholder({
      missingFields: ['productService'],
      state: { ...state, objective: 'reconhecimento_marca' },
    })).toBe('Ex.: Marca Ummix');
  });

  it('shows exactly the audience clarification when it is the current field', () => {
    const clarification = {
      prompt: 'Escolha o público mais adequado',
      options: [
        { id: 'audience-a', label: 'Opção A', filters: [] },
        { id: 'audience-b', label: 'Opção B', filters: [] },
      ],
    };
    expect(
      shouldShowAudienceClarification({
        missingFields: ['audienceConfirmation'],
        state: { ...state, audienceClarification: clarification },
      }),
    ).toBe(true);
    expect(
      shouldShowAudienceClarification({
        missingFields: ['audienceDescription', 'audienceConfirmation'],
        state: { ...state, audienceClarification: clarification },
      }),
    ).toBe(false);
  });

  it('uses a non-editable placeholder while audience alternatives are shown', () => {
    expect(
      assistantInputPlaceholder({
        missingFields: ['audienceConfirmation'],
        state,
      }),
    ).toBe('Escolha uma das opções de público acima');
  });
});
