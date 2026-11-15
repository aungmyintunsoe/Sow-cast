import { cn } from '../../lib/format';
import { Card } from './Card';

/** A grey placeholder block that gently pulses (static for reduced-motion users). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-lg bg-stone-200/80 motion-safe:animate-pulse', className)} />;
}

function HeaderSkeleton() {
  return (
    <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-3 flex-1">
        <Skeleton className="h-7 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="h-11 w-44 rounded-xl" />
    </Card>
  );
}

/** Page-shaped placeholder shown while a step's code or a region's data loads, so nothing jumps when it arrives. */
export function PageSkeleton({ variant }: { variant: 'brief' | 'rotations' | 'crops' | 'map' }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <HeaderSkeleton />
      {variant === 'brief' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5"><Skeleton className="h-72 w-full" /></Card>
            <Card className="p-5"><Skeleton className="h-72 w-full" /></Card>
          </div>
        </>
      )}
      {variant === 'rotations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </Card>
          ))}
        </div>
      )}
      {variant === 'crops' && (
        <Card className="divide-y divide-stone-200">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-5 flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
              <Skeleton className="h-8 w-14" />
            </div>
          ))}
        </Card>
      )}
      {variant === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-4">
          <Card className="p-4 space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</Card>
          <Card className="h-[420px] lg:h-[560px] p-0"><Skeleton className="h-full w-full rounded-2xl" /></Card>
        </div>
      )}
    </div>
  );
}
