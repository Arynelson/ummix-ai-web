import { CalendarDays, MapPin, Target, WalletCards } from 'lucide-react';
import type { CampaignState } from '../types';

const objectiveLabels: Record<string, string> = {
  reconhecimento_marca: 'Reconhecimento de marca',
  lancamento_produto: 'Lançamento de produto',
  promocao_oferta: 'Promoção ou oferta',
};

export function CampaignSummary({ state }: { state: CampaignState }) {
  const locations =
    state.locations?.length ? state.locations : state.location ? [state.location] : [];
  const locationLabel =
    locations.length > 0
      ? locations
          .map(
            (location) =>
              `${location.cityName}${location.stateUf ? `/${location.stateUf}` : ''}`,
          )
          .join(', ')
      : state.unresolvedLocation;

  return (
    <section className="summary-card" aria-labelledby="summary-title">
      <p className="eyebrow">Resumo em construção</p>
      <h2 id="summary-title">{state.productService || 'Sua campanha'}</h2>
      <dl>
        <SummaryItem
          icon={<Target size={18} aria-hidden="true" />}
          label="Objetivo"
          value={state.objective ? objectiveLabels[state.objective] : null}
        />
        <SummaryItem
          icon={<MapPin size={18} aria-hidden="true" />}
          label={locations.length > 1 ? 'Praças' : 'Praça'}
          value={locationLabel}
        />
        <SummaryItem
          icon={<WalletCards size={18} aria-hidden="true" />}
          label="Teto de orçamento"
          value={
            state.maximumBudget === null
              ? null
              : new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(state.maximumBudget)
          }
        />
        <SummaryItem
          icon={<CalendarDays size={18} aria-hidden="true" />}
          label="Início"
          value={formatDate(state.desiredStartDate)}
        />
      </dl>
      {state.audienceDescription && (
        <div className="audience-note">
          <small>Público</small>
          <p>{state.audienceDescription}</p>
        </div>
      )}
    </section>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt>
        {icon}
        {label}
      </dt>
      <dd className={value ? '' : 'pending'}>{value || 'Aguardando'}</dd>
    </div>
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
