"use client";

import { useRouter } from "next/navigation";

type Props = {
  from: string;
  to: string;
};

export function DashRange({ from, to }: Props) {
  const router = useRouter();

  function go(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/");
  }

  return (
    <div className="dash-range">
      <label>
        Inicio
        <input
          type="date"
          name="from"
          value={from}
          max={to || undefined}
          onChange={(event) => go(event.target.value, to)}
        />
      </label>
      <label>
        Fin
        <input
          type="date"
          name="to"
          value={to}
          min={from || undefined}
          onChange={(event) => go(from, event.target.value)}
        />
      </label>
    </div>
  );
}
