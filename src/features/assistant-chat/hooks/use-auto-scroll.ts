'use client';

import { type RefObject, useEffect, useRef } from 'react';

export function useAutoScroll<T extends HTMLElement>(trigger: unknown): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [trigger]);

  return ref;
}
