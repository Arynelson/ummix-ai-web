import type {
  AssistantContext,
  CampaignContentGeneratedContent,
  CampaignContentSessionView,
  SessionView,
} from './types';

const aiApiUrl = (import.meta.env.VITE_AI_API_URL || 'http://localhost:3010').replace(/\/$/, '');
const assistantApiUrl = `${aiApiUrl}/api/campaign-assistant`;

const TOKEN_KEY = 'ummix_assistant_access_token';
export const SESSION_KEY = 'ummix_campaign_assistant_session_id';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAssistantStorage(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('ummix_assistant_user');
}

export async function exchangeHandoff(handoffToken: string): Promise<void> {
  const response = await fetch(`${aiApiUrl}/api/auth/handoff/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handoffToken }),
  });
  const payload = (await response.json()) as {
    access_token?: string;
    user?: unknown;
    message?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.message || 'Não foi possível validar a sessão.');
  }
  storeAccessToken(payload.access_token);
  sessionStorage.setItem('ummix_assistant_user', JSON.stringify(payload.user ?? {}));
}

export const assistantApi = {
  context: () => request<AssistantContext>('/context'),
  createSession: (clientId?: string) =>
    request<SessionView>('/sessions', {
      method: 'POST',
      body: JSON.stringify(clientId ? { clientId } : {}),
    }),
  getSession: (id: string) => request<SessionView>(`/sessions/${id}`),
  sendMessage: (id: string, message: string) =>
    request<SessionView>(`/sessions/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  selectLocations: (id: string, cityIds: string[]) =>
    request<SessionView>(`/sessions/${id}/locations`, {
      method: 'POST',
      body: JSON.stringify({ cityIds }),
    }),
  confirmAudienceClarification: (id: string, alternativeId: string) =>
    request<SessionView>(`/sessions/${id}/audience/clarification`, {
      method: 'POST',
      body: JSON.stringify({ alternativeId }),
    }),
  finalize: (id: string) =>
    request<{ campaignId: string; wizardStep: 4; reviewUrl: string }>(
      `/sessions/${id}/finalize`,
      { method: 'POST' },
    ),
  deleteSession: (id: string) =>
    request<void>(`/sessions/${id}`, { method: 'DELETE' }),
};

export interface CampaignContentState {
  canGenerate: boolean;
  session: CampaignContentSessionView | null;
  content: CampaignContentGeneratedContent | null;
  draftContent: CampaignContentGeneratedContent | null;
}

export const campaignContentApi = {
  getState: (campaignId: string) =>
    campaignContentRequest<CampaignContentState>(campaignId, '', { method: 'GET' }),
  createSession: (campaignId: string) =>
    campaignContentRequest<CampaignContentSessionView>(campaignId, '/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  sendMessage: (campaignId: string, sessionId: string, input: {
    clientMessageId: string;
    text: string;
    expectedSessionVersion: number;
  }) =>
    campaignContentRequest<CampaignContentSessionView>(campaignId, `/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  generate: (campaignId: string, sessionId: string, generationKey: string) =>
    campaignContentRequest<CampaignContentGeneratedContent>(campaignId, `/sessions/${sessionId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ generationKey }),
    }),
  saveSelection: (campaignId: string, sessionId: string, input: {
    generationId: string;
    optionId: string;
    finalText: string;
    expectedSessionVersion: number;
  }) =>
    campaignContentRequest<CampaignContentGeneratedContent>(campaignId, `/sessions/${sessionId}/selection`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError('Sessão de autenticação ausente', 401);
  const response = await fetch(`${assistantApiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new ApiError(payload.message || 'Não foi possível concluir a solicitação.', response.status);
  }
  return payload;
}

async function campaignContentRequest<T>(
  campaignId: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError('Sessão de autenticação ausente', 401);
  const encodedCampaignId = encodeURIComponent(campaignId);
  const response = await fetch(
    `${aiApiUrl}/api/campaigns/${encodedCampaignId}/ai-content${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    },
  );
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new ApiError(payload.message || 'Não foi possível concluir a solicitação.', response.status);
  }
  return payload;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
