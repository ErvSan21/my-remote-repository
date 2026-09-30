"use client";

import { initials, whenText, type ActivityEntry, type PartyKind } from "@/lib/dashboard-model";

type Props = {
  items: ActivityEntry[];
  onOpen: (kind: PartyKind, id: string) => void;
};

/** Móvil: lista de actividad. Escritorio: franja con los 3 últimos movimientos. */
export function ActivityFeed({ items, onOpen }: Props) {
  return (
    <section className="gp-activity" aria-label="Actividad reciente">
      <h2 className="gp-section-title gp-activity-title">
        <span className="gp-only-mobile">Actividad reciente</span>
        <span className="gp-only-desktop">Actividad</span>
      </h2>
      {items.length === 0 ? (
        <p className="gp-empty">Todavía no hay movimientos.</p>
      ) : (
        <ul className="gp-activity-list">
          {items.map((a, i) => (
            <li key={a.key} className={i >= 3 ? "gp-only-mobile" : undefined}>
              <button type="button" className="gp-activity-item" onClick={() => onOpen(a.party.kind, a.party.id)}>
                <span className="gp-avatar gp-avatar-xs gp-avatar-ink" aria-hidden>
                  {a.by ? initials(a.by) : "·"}
                </span>
                <span className="gp-activity-main">
                  <span className="gp-activity-text">
                    {a.by ? <strong>{a.by} </strong> : null}
                    {a.by ? a.text : a.text.charAt(0).toUpperCase() + a.text.slice(1)}
                  </span>
                  <span className="gp-activity-when">{whenText(a.at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
