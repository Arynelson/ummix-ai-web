import type { SessionView } from '../types';

export function isCurrentAssistantField(
  missingFields: string[],
  field: string,
): boolean {
  return missingFields[0] === field;
}

export function shouldShowLocationSelector(
  session: Pick<SessionView, 'missingFields' | 'state'>,
): boolean {
  return (
    isCurrentAssistantField(session.missingFields, 'location') &&
    (session.state.locationOptions?.length ?? 0) > 0
  );
}

export function shouldShowChannelComparison(
  session: Pick<SessionView, 'missingFields' | 'state'>,
): boolean {
  return (
    isCurrentAssistantField(session.missingFields, 'selectedChannel') &&
    Boolean(session.state.comparison)
  );
}
