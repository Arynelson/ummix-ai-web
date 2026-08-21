import { Check, UsersRound } from 'lucide-react';
import type { AssistantAudienceClarification } from '../types';

interface AudienceClarificationProps {
  clarification: AssistantAudienceClarification;
  disabled: boolean;
  onSelect: (alternativeId: string) => void;
}

export function AudienceClarification({
  clarification,
  disabled,
  onSelect,
}: AudienceClarificationProps) {
  return (
    <section className="audience-clarification" aria-labelledby="audience-clarification-title">
      <div className="section-heading">
        <UsersRound size={18} aria-hidden="true" />
        <div>
          <p className="eyebrow">Confirme o público</p>
          <h2 id="audience-clarification-title">{clarification.prompt}</h2>
        </div>
      </div>
      <div className="audience-clarification-options" role="group" aria-label="Opções de público">
        {clarification.options.map((option) => (
          <button
            className="audience-clarification-option"
            type="button"
            key={option.id}
            onClick={() => onSelect(option.id)}
            disabled={disabled}
          >
            <span className="audience-option-title">
              <strong>{option.label}</strong>
              <Check size={16} aria-hidden="true" />
            </span>
            <span className="audience-option-filters">
              {option.filters.map((filter) => `${filter.question}: ${filter.option}`).join(' · ')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
