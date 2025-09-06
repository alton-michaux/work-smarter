import { useEffect, useRef } from 'react';

export function useInfiniteIntersection(onIntersect: () => void, disabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled || !ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect();
      },
      { rootMargin: '400px' } // prefetch ahead
    );
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [onIntersect, disabled]);

  return ref;
}
