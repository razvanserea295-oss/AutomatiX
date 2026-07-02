import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/v2/lib/cn';
import { useReducedMotion } from '@/v2/hooks/useReducedMotion';

type Props = {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
};

/** Scroll-triggered reveal — only animates elements entering viewport */
export default function RevealOnScroll({ children, className, rootMargin = '60px' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, rootMargin]);

  return (
    <div
      ref={ref}
      className={cn(!reduced && visible && 'v2-animate-reveal', className)}
      style={!reduced && !visible ? { opacity: 0 } : undefined}
    >
      {children}
    </div>
  );
}
