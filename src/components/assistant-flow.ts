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

export function shouldShowAudienceClarification(
  session: Pick<SessionView, 'missingFields' | 'state'>,
): boolean {
  return (
    isCurrentAssistantField(session.missingFields, 'audienceConfirmation') &&
    (session.state.audienceClarification?.options.length ?? 0) === 2
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

export function assistantInputPlaceholder(
  session: Pick<SessionView, 'missingFields' | 'state'>,
): string {
  switch (session.missingFields[0]) {
    case 'objective':
      return 'Ex.: Quero fortalecer minha marca';
    case 'location':
      return 'Selecione e confirme uma ou mais praças acima';
    case 'audienceConfirmation':
      return 'Escolha uma das opções de público acima';
    case 'productService':
      return session.state.objective === 'reconhecimento_marca'
        ? 'Ex.: Marca Ummix'
        : 'Ex.: Consultoria empresarial';
    case 'audienceDescription':
      return 'Ex.: Empresários e profissionais liberais interessados em tecnologia';
    case 'maximumBudget':
      return 'Ex.: 5000';
    case 'desiredStartDate':
      return 'Ex.: O mais rápido possível';
    case 'selectedChannel':
      return 'Escolha Rádio ou TV na comparação acima';
    case 'category':
      return 'Atualize a atividade comercial no cadastro para continuar';
    default:
      return 'Digite sua resposta';
  }
}
