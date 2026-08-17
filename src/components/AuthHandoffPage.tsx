import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { exchangeHandoff } from '../api';

const platformUrl = import.meta.env.VITE_UMMIX_WEB_URL || 'http://localhost:3000';

export function AuthHandoffPage() {
  const [error, setError] = useState<string | null>(null);
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setError('Token de autenticação ausente.');
      return;
    }
    void exchangeHandoff(token)
      .then(() => window.location.replace(resolveSafeReturnTo(window.location.search)))
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Não foi possível validar a sessão.');
      });
  }, []);

  return (
    <main className="centered-page">
      <section className="status-card" aria-live="polite">
        {error ? (
          <>
            <ShieldCheck aria-hidden="true" size={32} />
            <h1>Sessão não validada</h1>
            <p>{error}</p>
            <a className="button button-primary" href={`${platformUrl}/login`}>
              Voltar para a Ummix
            </a>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" aria-hidden="true" size={34} />
            <h1>Conectando com segurança</h1>
            <p>Aguarde enquanto validamos sua sessão da Ummix.</p>
          </>
        )}
      </section>
    </main>
  );
}

const campaignIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function resolveSafeReturnTo(search: string): string {
  const params = new URLSearchParams(search);
  const requested = params.get('returnTo');
  const fallbackCampaignId = params.get('campaignId');
  const candidate = requested || (fallbackCampaignId ? `/campaign-content?campaignId=${fallbackCampaignId}` : null);
  if (!candidate) return '/';

  try {
    const parsed = new URL(candidate, window.location.origin);
    if (parsed.origin !== window.location.origin || parsed.pathname !== '/campaign-content') return '/';
    const campaignId = parsed.searchParams.get('campaignId');
    if (!campaignId || !campaignIdPattern.test(campaignId)) return '/';
    return `/campaign-content?campaignId=${encodeURIComponent(campaignId)}`;
  } catch {
    return '/';
  }
}
