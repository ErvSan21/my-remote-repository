"use client";

import { useRouter } from "next/navigation";
import { DateRangeFields } from "@/components/date-range-fields";

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
    <DateRangeFields
      from={from}
      to={to}
      fromId="dash-from"
      toId="dash-to"
      onFrom={(value) => go(value, to)}
      onTo={(value) => go(from, value)}
    />
  );
}
