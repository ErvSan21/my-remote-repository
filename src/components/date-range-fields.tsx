type Props = {
  from: string;
  to: string;
  fromId: string;
  toId: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
};

export function DateRangeFields({
  from,
  to,
  fromId,
  toId,
  onFrom,
  onTo,
}: Props) {
  return (
    <div className="date-range">
      <label>
        <span className="sr-only">Inicio</span>
        <input
          id={fromId}
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onFrom(event.target.value)}
        />
      </label>
      <label>
        <span className="sr-only">Fin</span>
        <input
          id={toId}
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onTo(event.target.value)}
        />
      </label>
    </div>
  );
}
