import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/format';

/** The app's card: white, rounded, with a crisp dark outline and no shadow. Pass classes to tint or pad it. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border-[1.5px] border-stone-900 bg-white', className)} {...props} />;
}

interface PageHeaderProps {
  title: ReactNode;
  description: ReactNode;
  /** Usually the button that leads to the next step. */
  action?: ReactNode;
  /** Small print under the description (e.g. data sources). */
  note?: ReactNode;
  /** Extra content under the title row (e.g. the goal picker). */
  children?: ReactNode;
}

/** Title card at the top of each step. */
export function PageHeader({ title, description, note, action, children }: PageHeaderProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight text-stone-900 text-balance">{title}</h2>
          <p className="mt-1.5 max-w-[65ch] text-sm text-stone-600 text-pretty sm:text-base">{description}</p>
          {note && <p className="mt-2 max-w-[75ch] text-sm text-stone-500 text-pretty">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
