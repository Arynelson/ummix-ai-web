import { Radio, Sparkles, Tv } from 'lucide-react';
import type { CampaignState, MediaChannel, MediaPlan } from '../types';

interface Props {
  comparison: NonNullable<CampaignState['comparison']>;
  selectedChannel: MediaChannel | null;
  onSelect: (message: string) => void;
  disabled: boolean;
}

export function ChannelComparison({
  comparison,
  selectedChannel,
  onSelect,
  disabled,
}: Props) {
  return (
    <section className="comparison" aria-labelledby="comparison-title">
      <div className="section-heading">
        <Sparkles size={18} aria-hidden="true" />
        <div>
          <p className="eyebrow">Comparação calculada</p>
          <h2 id="comparison-title">Rádio ou TV</h2>
        </div>
      </div>
      <div className="channel-grid">
        <ChannelCard
          label="Rádio"
          icon={<Radio size={20} aria-hidden="true" />}
          plan={comparison.radio}
          recommended={comparison.recommendedChannel === 'radio'}
          selected={selectedChannel === 'radio'}
          onSelect={() => onSelect('Rádio')}
          disabled={disabled}
        />
        <ChannelCard
          label="TV"
          icon={<Tv size={20} aria-hidden="true" />}
          plan={comparison.tv}
          recommended={comparison.recommendedChannel === 'tv'}
          selected={selectedChannel === 'tv'}
          onSelect={() => onSelect('TV')}
          disabled={disabled}
        />
      </div>
      <p className="comparison-rationale">{comparison.rationale}</p>
    </section>
  );
}

function ChannelCard({
  label,
  icon,
  plan,
  recommended,
  selected,
  onSelect,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  plan: MediaPlan;
  recommended: boolean;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className={`channel-card${selected ? ' selected' : ''}`}
      onClick={onSelect}
      disabled={disabled || !plan.available}
      aria-pressed={selected}
    >
      <span className="channel-title">
        {icon}
        <strong>{label}</strong>
        {recommended && <span className="tag">Recomendado</span>}
      </span>
      {plan.available ? (
        <span className="channel-metrics">
          <span>
            <small>CPM</small>
            <strong>{formatCurrency(plan.cpm)}</strong>
          </span>
          <span>
            <small>Impressões</small>
            <strong>{formatNumber(plan.totalImpressions)}</strong>
          </span>
          <span>
            <small>Frequência</small>
            <strong>{plan.frequency ?? '—'}x</strong>
          </span>
          <span>
            <small>Período</small>
            <strong>{plan.periodWeeks ?? '—'} sem.</strong>
          </span>
        </span>
      ) : (
        <span className="unavailable">{plan.reasonUnavailable || 'Sem dados na praça'}</span>
      )}
    </button>
  );
}

function formatCurrency(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatNumber(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value);
}
