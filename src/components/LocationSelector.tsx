import { Check, MapPin } from 'lucide-react';

interface LocationOption {
  cityId: string;
  cityName: string;
  stateUf: string | null;
}

interface LocationSelectorProps {
  options: LocationOption[];
  selectedIds: string[];
  disabled: boolean;
  onToggle: (cityId: string) => void;
  onConfirm: () => void;
}

export function LocationSelector({
  options,
  selectedIds,
  disabled,
  onToggle,
  onConfirm,
}: LocationSelectorProps) {
  return (
    <section className="location-selector" aria-labelledby="location-selector-title">
      <div className="location-selector-heading">
        <span className="location-icon">
          <MapPin size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 id="location-selector-title">Praças disponíveis</h2>
          <p>Selecione uma ou mais cidades atendidas pela campanha.</p>
        </div>
      </div>
      <div className="location-options" role="group" aria-label="Cidades disponíveis">
        {options.map((option) => {
          const selected = selectedIds.includes(option.cityId);
          const label = `${option.cityName}${option.stateUf ? `/${option.stateUf}` : ''}`;
          return (
            <button
              className={`location-chip${selected ? ' selected' : ''}`}
              type="button"
              key={option.cityId}
              aria-pressed={selected}
              onClick={() => onToggle(option.cityId)}
              disabled={disabled}
            >
              {selected && <Check size={15} aria-hidden="true" />}
              {label}
            </button>
          );
        })}
      </div>
      <button
        className="button button-primary location-confirm"
        type="button"
        onClick={onConfirm}
        disabled={disabled || selectedIds.length === 0}
      >
        Confirmar {selectedIds.length === 1 ? 'praça' : 'praças'}
      </button>
    </section>
  );
}
