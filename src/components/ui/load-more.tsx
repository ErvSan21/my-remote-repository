"use client";

import { useState } from "react";

const PAGE = 10;

export function useLoadMore(resetKey: string, pageSize = PAGE) {
  const [shown, setShown] = useState(pageSize);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setShown(pageSize);
  }
  return {
    shown,
    more: () => setShown((count) => count + pageSize),
  };
}

export function LoadMoreButton({
  shown,
  total,
  onMore,
}: {
  shown: number;
  total: number;
  onMore: () => void;
}) {
  if (shown >= total) return null;
  const rest = total - shown;
  return (
    <button type="button" className="btn-load-more" onClick={onMore}>
      Cargar más{rest > 0 ? ` (${rest})` : ""}
    </button>
  );
}
