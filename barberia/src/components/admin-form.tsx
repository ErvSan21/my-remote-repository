"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";
import { buttonClass } from "@/lib/ui";

export function AdminForm({
  action,
  submitLabel,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      {children}
      {state?.error ? (
        <p role="alert" className="text-sm text-signal">
          {state.error}
        </p>
      ) : null}
      <button className={buttonClass} disabled={pending} type="submit">
        {pending ? "Guardando" : submitLabel}
      </button>
    </form>
  );
}
