import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/**
 * A whole number that counts to its new value when it changes (e.g. a crop's score when the goal
 * changes). Tabular figures keep its width fixed while it counts, so nothing beside it shifts.
 */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  // React renders only the first value; after that the effect owns the text, so React never
  // writes the final number a frame before the count starts.
  const firstValue = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      el.textContent = String(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.45,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      {firstValue.current}
    </span>
  );
}
