import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Crop, RotationOption } from '../../types';
import { PrimaryButton } from '../ui/Button';
import { PageHeader } from '../ui/Card';
import { RotationCard } from './RotationCard';

interface RotationCompareProps {
  regionName: string;
  rotations: RotationOption[];
  cropsMap: Record<string, Crop>;
  onContinue: () => void;
}

/** Step 3: the usual rotation next to two alternatives. */
export function RotationCompare({ regionName, rotations, cropsMap, onContinue }: RotationCompareProps) {
  // Tech debt: the chosen plan lives only in this component, so it is forgotten when the user leaves
  // the step. Lift it into App when the "My field plan" summary page is built.
  const [chosenId, setChosenId] = useState<string | null>(null);

  const choose = (id: string) => {
    setChosenId(id);
    // Skip the celebration for people who ask their system for less motion.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`3. Compare crop rotations for ${regionName}`}
        description="How the usual crop sequence here compares with two alternatives, including what could go wrong and what to check locally."
        action={
          <PrimaryButton onClick={onContinue}>
            <span>See best crops</span>
            <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {rotations.map((rot) => (
          <RotationCard key={rot.id} rotation={rot} cropsMap={cropsMap} chosen={chosenId === rot.id} onChoose={() => choose(rot.id)} />
        ))}
      </div>
    </div>
  );
}
