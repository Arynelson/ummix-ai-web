import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignContentGeneratedContent, CampaignContentSessionView } from '../types';
import { campaignContentApi, type CampaignContentState } from '../api';
import { CampaignContentPage } from './CampaignContentPage';
import { resolveSafeReturnTo } from './AuthHandoffPage';

const campaignId = '147dad44-1eea-411b-9b5d-1f6467d91712';
const sessionId = '93203443-1fe8-45d0-a90d-8ec96ba8042f';

function makeSession(
  status: CampaignContentSessionView['status'],
  version = 0,
): CampaignContentSessionView {
  return {
    sessionId,
    status,
    version,
    campaignContext: {
      campaignName: 'Campanha de inverno',
      brandName: 'Marca teste',
      objective: 'promocao_oferta',
      mediaChannel: 'radio',
      format: 'spot',
      durationSeconds: 1,
      paymentStatus: 'pending_payment',
      startDate: null,
      endDate: null,
      targetAudience: null,
      contextVersion: 'test-v1',
    },
    answers: {},
    currentQuestionKey: status === 'collecting' ? 'product_or_service' : null,
    missingFields: status === 'collecting' ? ['product_or_service'] : [],
    messages: [{
      id: 'message-1',
      role: 'assistant',
      type: 'question',
      text: 'Qual produto ou serviço a campanha deve divulgar?',
      createdAt: '2026-08-10T00:00:00.000Z',
    }],
    expiresAt: '2026-11-01T00:00:00.000Z',
  };
}

function makeContent(status: CampaignContentGeneratedContent['status']): CampaignContentGeneratedContent {
  return {
    generationId: 'b80b6c68-57cf-45b0-9605-70d53c4dfc1b',
    status,
    sessionVersion: 2,
    lengthPolicy: { version: 'pt-br-v1', durationSeconds: 1, minWords: 2, maxWords: 3 },
    options: [
      { id: 'option-1', text: 'Oferta especial', wordCount: 2, style: 'direto' },
      { id: 'option-2', text: 'Descubra novidades', wordCount: 2, style: 'emocional' },
      { id: 'option-3', text: 'Aproveite agora', wordCount: 2, style: 'promocional' },
    ],
    selectedOptionId: status === 'saved' ? 'option-1' : null,
    selectedTextOriginal: status === 'saved' ? 'Oferta especial' : null,
    finalText: status === 'saved' ? 'Oferta revisada' : null,
    isEdited: status === 'saved',
    wordCount: status === 'saved' ? 2 : null,
    emailStatus: 'not_sent',
  };
}

function state(session: CampaignContentSessionView | null, overrides: Partial<CampaignContentState> = {}): CampaignContentState {
  return {
    canGenerate: true,
    session,
    content: null,
    draftContent: null,
    ...overrides,
  };
}

beforeEach(() => {
  window.history.pushState({}, '', `/campaign-content?campaignId=${campaignId}`);
  sessionStorage.setItem('ummix_assistant_access_token', 'test-token');
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('CampaignContentPage', () => {
  it('retoma a sessão, envia a resposta e libera a geração quando o briefing termina', async () => {
    const collecting = makeSession('collecting');
    const ready = {
      ...makeSession('ready_to_generate', 1),
      messages: [
        ...collecting.messages,
        { id: 'message-2', role: 'user' as const, type: 'answer' as const, text: 'Produto teste', createdAt: '2026-08-10T00:01:00.000Z' },
        { id: 'message-3', role: 'assistant' as const, type: 'status' as const, text: 'Agora posso gerar as opções.', createdAt: '2026-08-10T00:02:00.000Z' },
      ],
    };
    vi.spyOn(campaignContentApi, 'getState').mockResolvedValue(state(null));
    vi.spyOn(campaignContentApi, 'createSession').mockResolvedValue(collecting);
    const sendMessage = vi.spyOn(campaignContentApi, 'sendMessage').mockResolvedValue(ready);

    render(<CampaignContentPage />);

    expect(await screen.findByText('Qual produto ou serviço a campanha deve divulgar?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sua resposta'), { target: { value: 'Produto teste' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith(campaignId, sessionId, expect.objectContaining({
      text: 'Produto teste',
      expectedSessionVersion: 0,
    })));
    expect(await screen.findByRole('button', { name: 'Gerar três opções' })).toBeInTheDocument();
  });

  it('gera três opções, permite editar e salva o texto escolhido', async () => {
    const ready = makeSession('ready_to_generate', 1);
    const generated = makeContent('options_ready');
    const saved = makeContent('saved');
    vi.spyOn(campaignContentApi, 'getState').mockResolvedValue(state(ready));
    const generate = vi.spyOn(campaignContentApi, 'generate').mockResolvedValue(generated);
    const saveSelection = vi.spyOn(campaignContentApi, 'saveSelection').mockResolvedValue(saved);

    render(<CampaignContentPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar três opções' }));

    expect(await screen.findByText('Descubra novidades')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Texto final'), { target: { value: 'Oferta revisada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar texto' }));

    await waitFor(() => expect(generate).toHaveBeenCalledWith(campaignId, sessionId, expect.any(String)));
    await waitFor(() => expect(saveSelection).toHaveBeenCalledWith(campaignId, sessionId, {
      generationId: generated.generationId,
      optionId: 'option-1',
      finalText: 'Oferta revisada',
      expectedSessionVersion: generated.sessionVersion,
    }));
    expect(await screen.findByText('Texto salvo')).toBeInTheDocument();
  });
});

describe('resolveSafeReturnTo', () => {
  it('aceita somente o retorno interno de campaign-content com UUID', () => {
    expect(resolveSafeReturnTo(`?returnTo=/campaign-content?campaignId=${campaignId}&external=https://evil.test`))
      .toBe(`/campaign-content?campaignId=${campaignId}`);
    expect(resolveSafeReturnTo('?returnTo=https://evil.test/campaign-content?campaignId=abc')).toBe('/');
  });
});
