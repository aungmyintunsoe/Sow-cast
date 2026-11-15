import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';
import { FADE } from '../../lib/motion';
import { CropDetails } from './CropDetails';
import { cropLabel, useCrops } from './CropContext';

const OPEN_DELAY = 450; // hover this long to open: long enough that passing over a name doesn't pop a card
const CLOSE_DELAY = 180; // grace period to move the pointer from the name into the card
const WIDTH = 360;

/**
 * A crop name that shows the crop's full details card when hovered for a moment, or when clicked/tapped.
 * Click pins the card open; Esc or a click outside closes it. Non-crop steps (fallow, tree crops) render as plain text.
 */
export function CropPeek({ id, className, children }: { id: string; className?: string; children?: ReactNode }) {
  const { cropsMap } = useCrops();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; origin: string; maxH: number } | null>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const cardId = useId();
  const label = children ?? cropLabel(id, cropsMap);

  const clear = () => window.clearTimeout(timer.current);
  const close = useCallback(() => {
    clear();
    setOpen(false);
    setPinned(false);
  }, []);
  const scheduleOpen = () => {
    clear();
    timer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY);
  };
  const scheduleClose = () => {
    clear();
    if (!pinned) timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  // Place the card below the name, or above when there is no room; keep it inside the viewport.
  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const place = () => {
      const r = anchor.current!.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight, gap = 8;
      const w = Math.min(WIDTH, vw - 24);
      const h = card.current?.offsetHeight ?? 420;
      const below = vh - r.bottom - gap - 12, above = r.top - gap - 12;
      const useBelow = below >= Math.min(h, 320) || below >= above;
      const left = Math.max(12, Math.min(r.left, vw - w - 12));
      setPos({
        left,
        top: useBelow ? r.bottom + gap : Math.max(12, r.top - gap - Math.min(h, above)),
        origin: `${useBelow ? 'top' : 'bottom'} ${r.left - left + 16}px`,
        maxH: Math.max(200, useBelow ? below : above),
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  // Esc and outside clicks close a card
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        anchor.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!card.current?.contains(t) && !anchor.current?.contains(t)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);
  useEffect(() => clear, []);

  if (!cropsMap[id]) return <span className={className}>{label}</span>;

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        aria-haspopup="dialog"
        onPointerEnter={(e) => e.pointerType === 'mouse' && scheduleOpen()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && scheduleClose()}
        onClick={(e) => {
          e.stopPropagation();
          clear();
          if (open && pinned) close();
          else {
            setOpen(true);
            setPinned(true);
          }
        }}
        className={cn(
          'cursor-help underline decoration-stone-400 decoration-dotted underline-offset-[3px] transition-colors hover:decoration-brand-600 hover:text-brand-800',
          className,
        )}
      >
        {label}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={card}
              id={cardId}
              role="dialog"
              aria-label={`${cropLabel(id, cropsMap, false)} details`}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={FADE}
              onPointerEnter={(e) => e.pointerType === 'mouse' && clear()}
              onPointerLeave={(e) => e.pointerType === 'mouse' && scheduleClose()}
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? 0, width: Math.min(WIDTH, window.innerWidth - 24), maxHeight: pos?.maxH, transformOrigin: pos?.origin }}
              className="fixed z-[60] overflow-y-auto overscroll-contain rounded-2xl border-[1.5px] border-stone-900 bg-white p-4 text-left text-stone-900 shadow-[0_12px_40px_-12px_rgba(28,25,23,0.35)]"
            >
              {pinned && (
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className={pinned ? 'pr-8' : undefined}>
                <CropDetails id={id} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
