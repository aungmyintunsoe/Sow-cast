// One motion vocabulary for the whole app. Springs are physical, so a new target mid-animation
// (e.g. switching goal while the list is still moving) retargets smoothly instead of restarting.
// Reduced-motion users get instant changes via <MotionConfig reducedMotion="user"> in App.
import type { Transition } from 'framer-motion';

/** Layout moves: list reordering, sliding selection pills, expanding panels. */
export const SPRING: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 };

/** Small fades for content appearing in place. */
export const FADE: Transition = { duration: 0.18, ease: [0.2, 0, 0, 1] };

/** Height animation for disclosure panels (accordion, crop details). */
export const COLLAPSE = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { ...SPRING, opacity: { duration: 0.12 } },
} as const;
