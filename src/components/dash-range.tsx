"use client";

import { DateRangeFields } from "@/components/date-range-fields";

type Props = {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
};

export function DashRange({ from, to, onFrom, onTo }: Props) {
  return (
    <DateRangeFields
      from={from}
      to={to}
      fromId="dash-from"
      toId="dash-to"
      onFrom={onFrom}
      onTo={onTo}
    />
  );
}
