import { describe, expect, it } from 'vitest';
import {
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
});
