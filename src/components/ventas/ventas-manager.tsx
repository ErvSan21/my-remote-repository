"use client";

import { useState } from "react";
import type { VentaRow } from "@/lib/data-types";
import { PageHeader } from "@/components/ui/page-header";
import { VentasClients } from "@/components/ventas/ventas-clients";

type Props = {
  ventas: VentaRow[];
  people: Record<string, string>;
  listError: string | null;
};

/** Pestaña "Clientes": saldos por cliente, su historial y cobros. */
export function VentasManager({ ventas, people, listError }: Props) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const selectedName = selectedClient
    ? ventas.find((v) => v.client_id === selectedClient)?.clients?.name ?? "Cliente"
    : null;

  return (
    <div className="data-stack module-page">
      {selectedName ? (
        <PageHeader
          variant="hero"
          title={selectedName}
          showAdd={false}
          onBack={() => setSelectedClient(null)}
        />
      ) : null}

      {listError ? <p className="module-note">{listError}</p> : null}

      <VentasClients
        ventas={ventas}
        people={people}
        selectedId={selectedClient}
        onSelect={setSelectedClient}
      />
    </div>
  );
}
