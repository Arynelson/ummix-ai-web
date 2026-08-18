import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CircleAlert,
  LoaderCircle,
  LogOut,
  MessageCircleMore,
  Plus,
  Send,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ApiError,
  SESSION_KEY,
  assistantApi,
  clearAssistantStorage,
  getAccessToken,
} from '../api';
import type { AssistantContext, SessionView } from '../types';
import { CampaignSummary } from './CampaignSummary';
import { ChannelComparison } from './ChannelComparison';
import { LocationSelector } from './LocationSelector';
import {
  shouldShowChannelComparison,
  shouldShowLocationSelector,
} from './assistant-flow';

const platformUrl = import.meta.env.VITE_UMMIX_WEB_URL || 'http://localhost:3000';
const enabled = import.meta.env.VITE_CAMPAIGN_ASSISTANT_ENABLED !== 'false';

export function AssistantPage() {
  const [context, setContext] = useState<AssistantContext | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleApiError = useCallback((caught: unknown) => {
    if (caught instanceof ApiError && caught.status === 401) {
      clearAssistantStorage();
      window.location.replace(`${platformUrl}/login`);
      return;
    }
    setError(caught instanceof Error ? caught.message : 'Ocorreu um erro inesperado.');
  }, []);

  const createSession = useCallback(
    async (clientId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const created = await assistantApi.createSession(clientId);
        sessionStorage.setItem(SESSION_KEY, created.id);
        setSession(created);
      } catch (caught) {
        handleApiError(caught);
      } finally {
        setLoading(false);
      }
    },
    [handleApiError],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!getAccessToken()) {
      window.location.replace(`${platformUrl}/dashboard`);
      return;
    }
    void assistantApi
      .context()
      .then(async (loadedContext) => {
        setContext(loadedContext);
        const storedSessionId = sessionStorage.getItem(SESSION_KEY);
        if (storedSessionId) {
          try {
            const restored = await assistantApi.getSession(storedSessionId);
            setSession(restored);
            return;
          } catch (caught) {
            if (!(caught instanceof ApiError) || ![404, 410].includes(caught.status)) {
              throw caught;
            }
            sessionStorage.removeItem(SESSION_KEY);
          }
        }
        if (!loadedContext.requiresClientSelection && loadedContext.clients[0] && !startedRef.current) {
          startedRef.current = true;
          await createSession(loadedContext.clients[0].id);
        }
      })
      .catch(handleApiError)
      .finally(() => setLoading(false));
  }, [createSession, handleApiError]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length]);

  useEffect(() => {
    const selectedLocations =
      session?.state.locations?.length
        ? session.state.locations
        : session?.state.location
          ? [session.state.location]
          : [];
    setSelectedLocationIds(selectedLocations.map((location) => location.cityId));
  }, [session?.id, session?.state.location, session?.state.locations]);

  async function submitMessage(value: string) {
    const trimmed = value.trim();
    if (!session || !trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const updated = await assistantApi.sendMessage(session.id, trimmed);
      setSession(updated);
      setMessage('');
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(message);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage(message);
    }
  }

  function handleMessageChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value.slice(0, 2000));
  }

  async function finalize() {
    if (!session || finalizing) return;
    setFinalizing(true);
    setError(null);
    try {
      const result = await assistantApi.finalize(session.id);
      window.location.assign(result.reviewUrl);
    } catch (caught) {
      handleApiError(caught);
      setFinalizing(false);
    }
  }

  function toggleLocation(cityId: string) {
    setSelectedLocationIds((current) =>
      current.includes(cityId)
        ? current.filter((selectedId) => selectedId !== cityId)
        : [...current, cityId],
    );
  }

  async function confirmLocations() {
    if (!session || selectedLocationIds.length === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const updated = await assistantApi.selectLocations(
        session.id,
        selectedLocationIds,
      );
      setSession(updated);
    } catch (caught) {
      handleApiError(caught);
    } finally {
      setSending(false);
    }
  }

  async function startOver() {
    if (session) {
      await assistantApi.deleteSession(session.id).catch(() => undefined);
    }
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setSelectedClientId('');
    startedRef.current = false;
    if (context && !context.requiresClientSelection && context.clients[0]) {
      await createSession(context.clients[0].id);
    }
  }

  if (!enabled) {
    return <Unavailable message="O assistente está desativado neste ambiente." />;
  }
  if (loading) {
    return (
      <main className="centered-page" aria-live="polite">
        <LoaderCircle className="spin" size={36} aria-hidden="true" />
        <p>Preparando seu assistente…</p>
      </main>
    );
  }
  if (!context) {
    return <Unavailable message={error || 'Não foi possível carregar seu perfil.'} />;
  }
  if (!session && context.requiresClientSelection) {
    return (
      <ClientSelection
        context={context}
        selectedClientId={selectedClientId}
        onChange={setSelectedClientId}
        onContinue={() => void createSession(selectedClientId)}
        error={error}
      />
    );
  }
  if (!session) {
    return <Unavailable message={error || 'Não foi possível iniciar o assistente.'} />;
  }

  return (
    <main className="assistant-shell">
      <header className="topbar">
        <a href={`${platformUrl}/dashboard`} className="brand" aria-label="Voltar ao dashboard Ummix">
          <span>UMMIX</span>
          <small>ADS</small>
        </a>
        <div className="topbar-actions">
          <button className="text-button" type="button" onClick={() => void startOver()}>
            <Plus size={17} aria-hidden="true" />
            Nova conversa
          </button>
          <a className="icon-link" href={`${platformUrl}/dashboard`} aria-label="Sair do assistente">
            <LogOut size={19} aria-hidden="true" />
          </a>
        </div>
      </header>

      <div className="workspace">
        <section className="chat-panel" aria-labelledby="assistant-title">
          <div className="chat-heading">
            <span className="bot-mark">
              <Bot size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">Assistente de campanha</p>
              <h1 id="assistant-title">Vamos montar uma proposta</h1>
              <p>Campanha para {displayClient(session.client)}</p>
            </div>
          </div>

          <div className="messages" aria-live="polite" aria-relevant="additions">
            {session.messages.map((item, index) => (
              <article
                className={`message ${item.role}`}
                key={`${item.createdAt}-${index}`}
                aria-label={item.role === 'assistant' ? 'Assistente' : 'Você'}
              >
                {item.role === 'assistant' && <Bot size={17} aria-hidden="true" />}
                <p>{item.content}</p>
              </article>
            ))}
            {sending && (
              <div className="message assistant typing" aria-label="Assistente está respondendo">
                <Bot size={17} aria-hidden="true" />
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {session.quickReplies.length > 0 && (
            <div className="quick-replies" aria-label="Respostas rápidas">
              {session.quickReplies.map((reply) => (
                <button
                  type="button"
                  key={reply}
                  onClick={() => void submitMessage(reply)}
                  disabled={sending}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {shouldShowLocationSelector(session) && (
              <LocationSelector
                options={session.state.locationOptions ?? []}
                selectedIds={selectedLocationIds}
                disabled={sending}
                onToggle={toggleLocation}
                onConfirm={() => void confirmLocations()}
              />
            )}

          {shouldShowChannelComparison(session) && session.state.comparison && (
            <ChannelComparison
              comparison={session.state.comparison}
              selectedChannel={session.state.selectedChannel}
              onSelect={(reply) => void submitMessage(reply)}
              disabled={sending}
            />
          )}

          {session.fallbackToManual && (
            <div className="notice warning">
              <CircleAlert size={18} aria-hidden="true" />
              <p>
                Seus dados permanecem nesta sessão. Se preferir,{' '}
                <a href={`${platformUrl}/wizard`}>continue pelo criador manual</a>.
              </p>
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              <CircleAlert size={18} aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <form className="composer" onSubmit={handleSubmit}>
            <label htmlFor="campaign-message">Sua resposta</label>
            <div>
              <textarea
                id="campaign-message"
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder="Ex.: Quero divulgar minha clínica em Goiânia para mulheres de 30 a 50 anos, com até R$ 5.000…"
                maxLength={2000}
                rows={2}
                disabled={sending || session.status === 'completed'}
              />
              <button
                className="send-button"
                type="submit"
                disabled={!message.trim() || sending}
                aria-label="Enviar mensagem"
              >
                {sending ? (
                  <LoaderCircle className="spin" size={19} aria-hidden="true" />
                ) : (
                  <Send size={19} aria-hidden="true" />
                )}
              </button>
            </div>
            <small>{message.length}/2.000</small>
          </form>
        </section>

        <aside className="proposal-panel">
          <CampaignSummary state={session.state} />
          <div className="proposal-actions">
            <p>
              O orçamento é um teto. Você ainda poderá editar tudo na revisão antes de escolher
              o pagamento.
            </p>
            <button
              className="button button-primary review-button"
              type="button"
              onClick={() => void finalize()}
              disabled={!session.readyToFinalize || finalizing}
            >
              {finalizing ? (
                <LoaderCircle className="spin" size={18} aria-hidden="true" />
              ) : (
                <ArrowRight size={18} aria-hidden="true" />
              )}
              Criar rascunho e revisar
            </button>
            {!session.readyToFinalize && (
              <small>
                {session.missingFields.length} informação
                {session.missingFields.length === 1 ? '' : 'ões'} pendente
                {session.missingFields.length === 1 ? '' : 's'}
              </small>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function ClientSelection({
  context,
  selectedClientId,
  onChange,
  onContinue,
  error,
}: {
  context: AssistantContext;
  selectedClientId: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  error: string | null;
}) {
  return (
    <main className="selection-page">
      <a className="back-link" href={`${platformUrl}/dashboard`}>
        <ArrowLeft size={17} aria-hidden="true" />
        Voltar ao dashboard
      </a>
      <section className="selection-card">
        <span className="bot-mark large">
          <MessageCircleMore size={27} aria-hidden="true" />
        </span>
        <p className="eyebrow">Antes de começar</p>
        <h1>Para qual cliente é a campanha?</h1>
        <p>Selecione um cliente ativo vinculado ao seu cadastro.</p>
        <label htmlFor="client">Cliente</label>
        <select
          id="client"
          value={selectedClientId}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        >
          <option value="">Selecione</option>
          {context.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {displayClient(client)}
            </option>
          ))}
        </select>
        {context.clients.length === 0 && (
          <p className="notice warning">Nenhum cliente ativo está disponível.</p>
        )}
        {error && <p className="field-error">{error}</p>}
        <button
          className="button button-primary"
          type="button"
          onClick={onContinue}
          disabled={!selectedClientId}
        >
          Começar
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <main className="centered-page">
      <section className="status-card">
        <CircleAlert size={31} aria-hidden="true" />
        <h1>Assistente indisponível</h1>
        <p>{message}</p>
        <a className="button button-primary" href={`${platformUrl}/dashboard`}>
          Voltar ao dashboard
        </a>
      </section>
    </main>
  );
}

function displayClient(client: { companyName: string | null; companyBrand: string | null; fullName: string }) {
  return client.companyName || client.companyBrand || client.fullName;
}
