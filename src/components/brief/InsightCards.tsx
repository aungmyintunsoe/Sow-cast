import { AlertTriangle, Info, Sparkles } from 'lucide-react';
import type { PlainInsight } from '../../types';
import { Card } from '../ui/Card';
import { Pill } from '../ui/Pill';

const KINDS = {
  warning: { label: 'Watch out', Icon: AlertTriangle, card: 'bg-amber-50/60', badge: 'bg-amber-200/80 text-amber-900' },
  opportunity: { label: 'Opportunity', Icon: Sparkles, card: 'bg-brand-50/60', badge: 'bg-brand-200/80 text-brand-900' },
  neutral: { label: 'Pattern', Icon: Info, card: '', badge: 'bg-stone-200 text-stone-800' },
} as const;

/** Up to three plain-language findings, each with its source and confidence. */
export function InsightCards({ insights }: { insights: PlainInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className={`grid grid-cols-1 gap-4 ${insights.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
      {insights.map((insight) => {
        const kind = KINDS[insight.badgeType ?? 'neutral'];
        return (
          <Card key={insight.title} className={`p-4 flex flex-col justify-between ${kind.card}`}>
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <Pill className={`rounded-full text-xs font-bold ${kind.badge}`}>
                  <kind.Icon className="w-3.5 h-3.5" />
                  {kind.label}
                </Pill>
                <span className="text-xs font-medium text-stone-500">Confidence: {insight.confidence}</span>
              </div>
              <h3 className="font-bold text-stone-900 text-base leading-snug">{insight.title}</h3>
              <p className="text-sm text-stone-700 mt-2 leading-relaxed">{insight.body}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-stone-200/70 text-xs font-semibold text-stone-500">Source: {insight.source}</div>
          </Card>
        );
      })}
    </div>
  );
}
