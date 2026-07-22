'use client';

import { type RefObject, useEffect, useRef } from 'react';

/**
 * Keeps a scroll container pinned to the bottom whenever `deps` change
 * (reproduces the ChatPanel effect at prototype lines 2649–2651).
 * Returns a ref to attach to the scrollable element.
 */
export function useAutoScroll<T extends HTMLElement>(deps: unknown[]): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
