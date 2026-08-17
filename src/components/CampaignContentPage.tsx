import {
  ArrowLeft,
  Bot,
  Check,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ApiError,
  campaignContentApi,
  getAccessToken,
  type CampaignContentState,
} from '../api';
import type {
  CampaignContentGeneratedContent,
  CampaignContentOption,
  CampaignContentSessionView,
} from '../types';

const platformUrl = import.meta.env.VITE_UMMIX_WEB_URL || 'http://localhost:3000';
const campaignIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function CampaignContentPage() {
  const campaignId = useMemo(
    () => new URLSearchParams(window.location.search).get('campaignId'),
    [],
  );
  const [remoteState, setRemoteState] = useState<CampaignContentState | null>(null);
  const [session, setSession] = useState<CampaignContentSessionView | null>(null);
  const [content, setContent] = useState<CampaignContentGeneratedContent | null>(null);
  const [draftContent, setDraftContent] = useState<CampaignContentGeneratedContent | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const draftIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const adoptState = useCallback((next: CampaignContentState) => {
    setRemoteState(next);
    setSession(next.session);
    setContent(next.content);
    setDraftContent(next.draftContent);
  }, []);

  const handleError = useCallback((caught: unknown) => {
    if (caught instanceof ApiError && caught.status === 401) {
      window.location.replace(`${platformUrl}/login`);
      return;
    }
    setError(caught instanceof Error ? caught.message : 'Ocorreu um erro inesperado.');
  }, []);

  const refresh = useCallback(async () => {
    if (!campaignId) return;
    const next = await campaignContentApi.getState(campaignId);
    adoptState(next);
  }, [adoptState, campaignId]);

  useEffect(() => {
    if (initializedRef.current || !campaignId || !campaignIdPattern.test(campaignId)) {
      setLoading(false);
      return;
    }
    initializedRef.current = true;
    if (!getAccessToken()) {
      window.location.replace(`${platformUrl}/login`);
      return;
    }

    void (async () => {
      try {
        const next = await campaignContentApi.getState(campaignId);
        adoptState(next);
        if (!next.session && next.canGenerate) {
          const created = await campaignContentApi.createSession(campaignId);
          setSession(created);
          setRemoteState((current) => current ? { ...current, session: created } : current);
        }
      } catch (caught) {
        handleError(caught);
      } finally {
        setLoading(false);
      }
    })();
  }, [adoptState, campaignId, handleError]);

  useEffect(() => {
    if (!draftContent || draftIdRef.current === draftContent.generationId) return;
    draftIdRef.current = draftContent.generationId;
    const firstOption = draftContent.options[0];
    setSelectedOptionId(draftContent.selectedOptionId || firstOption?.id || null);
    setDraftText(draftContent.finalText || firstOption?.text || '');
  }, [draftContent]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages.length]);

  useEffect(() => {
    if (draftContent?.status !== 'generating') return undefined;
    const timer = window.setInterval(() => {
      void refresh().catch(handleError);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [draftContent?.status, handleError, refresh]);

  async function submitMessage(value: string) {
    const trimmed = value.trim();
    if (!campaignId || !session || !trimmed || sending) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await campaignContentApi.sendMessage(campaignId, session.sessionId, {
        clientMessageId: createId(),
        text: trimmed,
        expectedSessionVersion: session.version,
      });
      setSession(updated);
      setMessage('');
    } catch (caught) {
      handleError(caught);
      if (caught instanceof ApiError && caught.status === 409) {
        await refresh().catch(handleError);
      }
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

  async function generateOptions() {
    if (!campaignId || !session || generating || !['ready_to_generate', 'options_ready'].includes(session.status)) return;
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const generated = await campaignContentApi.generate(campaignId, session.sessionId, createId());
      setDraftContent(generated);
      setSession((current) => current ? {
        ...current,
        status: generated.status === 'generating' ? 'generating' : 'options_ready',
        version: generated.sessionVersion,
      } : current);
    } catch (caught) {
      handleError(caught);
    } finally {
      setGenerating(false);
    }
  }

  async function saveContent() {
    if (!campaignId || !session || !draftContent || !selectedOptionId || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await campaignContentApi.saveSelection(campaignId, session.sessionId, {
        generationId: draftContent.generationId,
        optionId: selectedOptionId,
        finalText: draftText.trim(),
        expectedSessionVersion: draftContent.sessionVersion,
      });
      setContent(saved);
      setDraftContent(null);
      setSelectedOptionId(null);
      setDraftText('');
      setSession((current) => current ? {
        ...current,
        status: 'saved',
        version: saved.sessionVersion,
      } : current);
      setNotice('Conteúdo salvo. A notificação administrativa ficará disponível quando o envio de e-mail for habilitado.');
    } catch (caught) {
      handleError(caught);
      if (caught instanceof ApiError && caught.status === 409) {
        await refresh().catch(handleError);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!campaignId || !campaignIdPattern.test(campaignId)) {
    return <ContentUnavailable message="Campanha não identificada." />;
  }
  if (loading) {
    return (
      <main className="centered-page" aria-live="polite">
        <LoaderCircle className="spin" size={36} aria-hidden="true" />
        <p>Preparando o conteúdo da campanha…</p>
      </main>
    );
  }
  if (!remoteState || !session) {
    return <ContentUnavailable message={error || 'Não foi possível iniciar o conteúdo da campanha.'} />;
  }

  const policy = draftContent?.lengthPolicy || content?.lengthPolicy || null;
  const wordCount = countWords(draftText);
  const canSave = Boolean(
    draftContent &&
      selectedOptionId &&
      draftText.trim() &&
      policy &&
      wordCount >= policy.minWords &&
      wordCount <= policy.maxWords,
  );
  const canAnswer = ['collecting', 'ready_to_generate'].includes(session.status);

  return (
    <main className="content-shell">
      <header className="topbar">
        <a href={`${platformUrl}/dashboard`} className="brand" aria-label="Voltar ao dashboard Ummix">
          <span>UMMIX</span>
          <small>ADS</small>
        </a>
        <a className="content-back-link" href={`${platformUrl}/dashboard`}>
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar para campanhas
        </a>
      </header>

      <div className="content-workspace">
        <section className="content-chat-panel" aria-labelledby="content-title">
          <div className="content-heading">
            <span className="bot-mark content-icon-tile">
              <Sparkles size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow">Conteúdo de campanha</p>
              <h1 id="content-title">Vamos criar o texto da sua campanha</h1>
              <p>Responda algumas perguntas para deixar a mensagem mais precisa.</p>
            </div>
          </div>

          <div className="content-messages" aria-live="polite" aria-relevant="additions">
            {session.messages.map((item, index) => (
              <article
                className={`content-message ${item.role}`}
                key={`${item.id}-${index}`}
                aria-label={item.role === 'assistant' ? 'Assistente' : 'Você'}
              >
                {item.role === 'assistant' && <Bot size={17} aria-hidden="true" />}
                <p>{item.text}</p>
              </article>
            ))}
            {sending && (
              <div className="content-message assistant content-typing" aria-label="Assistente está respondendo">
                <Bot size={17} aria-hidden="true" />
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="notice error" role="alert">
              <CircleAlert size={18} aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}
          {notice && (
            <div className="notice success" role="status">
              <Check size={18} aria-hidden="true" />
              <p>{notice}</p>
            </div>
          )}

          <form className="content-composer" onSubmit={handleSubmit}>
            <label htmlFor="content-message">Sua resposta</label>
            <div>
              <textarea
                id="content-message"
                value={message}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value.slice(0, 2000))}
                onKeyDown={handleKeyDown}
                placeholder="Ex.: Quero divulgar um produto para mulheres de 30 a 50 anos…"
                maxLength={2000}
                rows={2}
                disabled={!canAnswer || sending}
              />
              <button
                className="send-button"
                type="submit"
                disabled={!message.trim() || !canAnswer || sending}
                aria-label="Enviar resposta"
              >
                {sending ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <Send size={19} aria-hidden="true" />}
              </button>
            </div>
            <small>{message.length}/2.000</small>
          </form>
        </section>

        <aside className="content-side-panel">
          <CampaignContextCard session={session} />
          <section className="content-options-card" aria-labelledby="options-title">
            <div className="content-section-heading">
              <span className="content-icon-tile small"><Sparkles size={18} aria-hidden="true" /></span>
              <div>
                <p className="eyebrow">Próximo passo</p>
                <h2 id="options-title">Opções de texto</h2>
              </div>
            </div>

            {session.missingFields.length > 0 && (
              <div className="content-pending-note">
                <Clock3 size={17} aria-hidden="true" />
                <p>Falta responder {session.missingFields.length === 1 ? 'uma informação' : `${session.missingFields.length} informações`} para gerar as opções.</p>
              </div>
            )}

            {session.status === 'ready_to_generate' && (
              <button className="button button-primary content-generate-button" type="button" onClick={() => void generateOptions()} disabled={generating}>
                {generating ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
                Gerar três opções
              </button>
            )}

            {session.status === 'options_ready' && draftContent && (
              <ContentEditor
                content={draftContent}
                selectedOptionId={selectedOptionId}
                draftText={draftText}
                wordCount={wordCount}
                canSave={canSave}
                saving={saving}
                onSelect={(option) => {
                  setSelectedOptionId(option.id);
                  setDraftText(option.text);
                }}
                onChange={setDraftText}
                onSave={() => void saveContent()}
                onRegenerate={() => void generateOptions()}
                regenerating={generating}
              />
            )}

            {draftContent?.status === 'generating' && (
              <div className="content-generating-state" role="status">
                <LoaderCircle className="spin" size={22} aria-hidden="true" />
                <p>Preparando três opções de texto…</p>
                <small>Você pode aguardar nesta tela; o resultado será atualizado automaticamente.</small>
              </div>
            )}

            {content?.status === 'saved' && !draftContent && (
              <SavedContent content={content} />
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function CampaignContextCard({ session }: { session: CampaignContentSessionView }) {
  const context = session.campaignContext;
  return (
    <section className="content-context-card" aria-labelledby="context-title">
      <p className="eyebrow">Resumo da campanha</p>
      <h2 id="context-title">{context.campaignName || 'Campanha sem nome'}</h2>
      <dl>
        <div><dt>Canal</dt><dd>{channelLabel(context.mediaChannel)}</dd></div>
        <div><dt>Duração</dt><dd>{context.durationSeconds}s</dd></div>
        <div><dt>Formato</dt><dd>{context.format || 'Não informado'}</dd></div>
        <div><dt>Objetivo</dt><dd>{context.objective || 'Não informado'}</dd></div>
      </dl>
    </section>
  );
}

function ContentEditor({
  content,
  selectedOptionId,
  draftText,
  wordCount,
  canSave,
  saving,
  onSelect,
  onChange,
  onSave,
  onRegenerate,
  regenerating,
}: {
  content: CampaignContentGeneratedContent;
  selectedOptionId: string | null;
  draftText: string;
  wordCount: number;
  canSave: boolean;
  saving: boolean;
  onSelect: (option: CampaignContentOption) => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div className="content-editor">
      <p className="content-helper">Escolha uma opção e edite o texto antes de salvar.</p>
      <div className="content-option-list" role="radiogroup" aria-label="Opções geradas">
        {content.options.map((option, index) => (
          <button
            className={`content-option ${selectedOptionId === option.id ? 'selected' : ''}`}
            type="button"
            aria-pressed={selectedOptionId === option.id}
            key={option.id}
            onClick={() => onSelect(option)}
          >
            <span className="content-option-topline">
              <strong>Opção {index + 1}</strong>
              <span>{option.style || 'Estilo livre'}</span>
            </span>
            <span>{option.text}</span>
            {selectedOptionId === option.id && <Check size={17} aria-hidden="true" />}
          </button>
        ))}
      </div>

      <label className="content-editor-label" htmlFor="final-content">
        <Pencil size={16} aria-hidden="true" />
        Texto final
      </label>
      <textarea
        id="final-content"
        className="content-editor-textarea"
        value={draftText}
        onChange={(event) => onChange(event.target.value.slice(0, 12000))}
        maxLength={12000}
        rows={8}
      />
      <div className={`content-word-count ${canSave ? 'valid' : 'invalid'}`}>
        <span>{wordCount} palavras</span>
        <span>Permitido: {content.lengthPolicy.minWords}–{content.lengthPolicy.maxWords}</span>
      </div>
      {!canSave && <p className="content-length-warning">Ajuste o texto para ficar dentro da duração da propaganda.</p>}

      <div className="content-editor-actions">
        <button className="button button-secondary" type="button" onClick={onRegenerate} disabled={regenerating || saving}>
          {regenerating ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <RefreshCw size={17} aria-hidden="true" />}
          Gerar novamente
        </button>
        <button className="button button-primary" type="button" onClick={onSave} disabled={!canSave || saving}>
          {saving ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
          Salvar texto
        </button>
      </div>
    </div>
  );
}

function SavedContent({ content }: { content: CampaignContentGeneratedContent }) {
  return (
    <div className="content-saved-state">
      <div className="content-saved-heading">
        <span className="content-icon-tile small"><Check size={18} aria-hidden="true" /></span>
        <div>
          <strong>Texto salvo</strong>
          <span>{content.wordCount ?? 0} palavras</span>
        </div>
      </div>
      <p>{content.finalText}</p>
      <small>Notificação administrativa: {emailStatusLabel(content.emailStatus)}</small>
    </div>
  );
}

export function ContentUnavailable({ message }: { message: string }) {
  return (
    <main className="centered-page">
      <section className="status-card">
        <CircleAlert size={31} aria-hidden="true" />
        <h1>Conteúdo indisponível</h1>
        <p>{message}</p>
        <a className="button button-primary" href={`${platformUrl}/dashboard`}>Voltar para a Ummix</a>
      </section>
    </main>
  );
}

function channelLabel(channel: 'radio' | 'tv' | 'both'): string {
  if (channel === 'radio') return 'Rádio';
  if (channel === 'tv') return 'TV';
  return 'Rádio e TV';
}

function emailStatusLabel(status: CampaignContentGeneratedContent['emailStatus']): string {
  if (status === 'sent') return 'enviada';
  if (status === 'failed') return 'falhou';
  if (status === 'sending' || status === 'pending') return 'pendente';
  return 'aguardando habilitação';
}

function countWords(text: string): number {
  const normalized = text.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
