import { useState } from 'react';
import { cn } from '../../lib/format';

/** Sowy's tips, one per click. */
const TIPS = [
  "Hi, I'm Sowy! I check the rain before I plant.",
  'Legumes put nitrogen back in my soil.',
  'Bare soil in a downpour washes my topsoil away.',
  'Same crop every year? My pests love that.',
  'Ask me anything in Claude!',
];

/**
 * A small pixel-art scene for the Claude skill sections: Sowy, Sowcast's mascot (a seed with a sprout on its head),
 * hops and blinks while a little rain cloud waters a seedling that grows in three steps, then the loop starts over.
 * Pure SVG + CSS (steps() timing for a pixel feel); static when the visitor prefers reduced motion.
 */
const ORANGE = '#a0673f'; // seed brown
const DARK = '#1c1917';

function Px({ x, y, w = 1, h = 1, fill }: { x: number; y: number; w?: number; h?: number; fill: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} />;
}

export function SeedGarden({ className }: { className?: string }) {
  const [clicks, setClicks] = useState(0);
  return (
    <div className={cn('relative', className)}>
    <span key={clicks} role="status" className="sowy-bubble absolute bottom-full left-0 mb-2 max-w-[16rem] rounded-xl border-[1.5px] border-stone-900 bg-white px-3 py-2 text-sm font-semibold text-stone-900 shadow-lg">
      {clicks === 0 ? "I'm Sowy! Tap me." : TIPS[(clicks - 1) % TIPS.length]}
    </span>
    <button
      type="button"
      onClick={() => setClicks((c) => c + 1)}
      title="Sowy"
      aria-label="Sowy, the Sowcast seed. Click for a farming tip."
      className="group block w-full cursor-pointer rounded-lg"
    >
    <svg viewBox="0 0 64 30" className="block h-auto w-full" shapeRendering="crispEdges" aria-hidden="true">
      {/* ground */}
      <Px x={0} y={26} w={64} h={1} fill="#8b6b4c" />
      <Px x={0} y={27} w={64} h={3} fill="#a7845f" />

      {/* ---- Sowy: a big hop on each click (key restarts it), a wiggle on hover ---- */}
      <g key={clicks} className={clicks ? 'sowy-boing' : undefined}>
      <g className="sowy-wiggle">
      <g className="seed-hop">
        {/* sprout on its head */}
        <Px x={12} y={8} w={1} h={4} fill="#2c8742" />
        <Px x={10} y={8} w={2} h={1} fill="#62c279" />
        <Px x={9} y={7} w={2} h={1} fill="#3ba755" />
        <Px x={13} y={9} w={2} h={1} fill="#62c279" />
        <Px x={14} y={8} w={2} h={1} fill="#3ba755" />
        {/* body: a rounded seed, wider in the middle */}
        <Px x={11} y={11} w={4} h={1} fill={ORANGE} />
        <Px x={9} y={12} w={8} h={1} fill={ORANGE} />
        <Px x={8} y={13} w={10} h={1} fill={ORANGE} />
        <Px x={7} y={14} w={12} h={5} fill={ORANGE} />
        <Px x={8} y={19} w={10} h={1} fill={ORANGE} />
        <Px x={9} y={20} w={8} h={1} fill={ORANGE} />
        <Px x={9} y={13} w={2} h={1} fill="#c08457" />
        {/* round eyes with a shine, rosy cheeks */}
        <g className="seed-blink">
          <Px x={9} y={15} w={2} h={2} fill={DARK} />
          <Px x={15} y={15} w={2} h={2} fill={DARK} />
          <Px x={9} y={15} w={1} h={1} fill="#ffffff" />
          <Px x={15} y={15} w={1} h={1} fill="#ffffff" />
        </g>
        <Px x={8} y={17} w={1} h={1} fill="#e8907e" />
        <Px x={17} y={17} w={1} h={1} fill="#e8907e" />
        {/* two little feet, two frames that alternate */}
        <g className="seed-legs-a">
          <Px x={10} y={21} w={2} h={1} fill="#7a4a2a" />
          <Px x={14} y={21} w={2} h={1} fill="#7a4a2a" />
        </g>
        <g className="seed-legs-b">
          <Px x={9} y={21} w={2} h={1} fill="#7a4a2a" />
          <Px x={15} y={21} w={2} h={1} fill="#7a4a2a" />
        </g>
      </g>
      </g>
      </g>
      {/* shadow */}
      <Px x={7} y={25} w={12} h={1} fill="#00000022" />

      {/* ---- rain cloud ---- */}
      <g className="seed-cloud">
        <Px x={38} y={3} w={12} h={3} fill="#e7e5e4" />
        <Px x={40} y={1} w={6} h={2} fill="#e7e5e4" />
        <Px x={37} y={4} w={14} h={2} fill="#d6d3d1" />
        <g className="seed-rain">
          <Px x={40} y={8} w={1} h={2} fill="#60a5fa" />
          <Px x={44} y={10} w={1} h={2} fill="#60a5fa" />
          <Px x={48} y={7} w={1} h={2} fill="#60a5fa" />
        </g>
        <g className="seed-rain seed-rain-2">
          <Px x={42} y={12} w={1} h={2} fill="#3b82f6" />
          <Px x={46} y={14} w={1} h={2} fill="#3b82f6" />
        </g>
      </g>

      {/* ---- seedling, three growth stages ---- */}
      <Px x={41} y={25} w={7} h={1} fill="#6b4f36" />
      <g className="sprout-1">
        <Px x={44} y={23} w={1} h={2} fill="#2c8742" />
        <Px x={43} y={22} w={1} h={1} fill="#62c279" />
        <Px x={45} y={22} w={1} h={1} fill="#62c279" />
      </g>
      <g className="sprout-2">
        <Px x={44} y={19} w={1} h={6} fill="#2c8742" />
        <Px x={42} y={20} w={2} h={1} fill="#62c279" />
        <Px x={45} y={18} w={2} h={1} fill="#62c279" />
        <Px x={41} y={19} w={1} h={1} fill="#3ba755" />
        <Px x={47} y={17} w={1} h={1} fill="#3ba755" />
      </g>
      <g className="sprout-3">
        <Px x={44} y={15} w={1} h={10} fill="#256b37" />
        <Px x={42} y={19} w={2} h={1} fill="#62c279" />
        <Px x={40} y={18} w={2} h={1} fill="#3ba755" />
        <Px x={45} y={16} w={2} h={1} fill="#62c279" />
        <Px x={47} y={15} w={2} h={1} fill="#3ba755" />
        <Px x={43} y={13} w={3} h={2} fill="#e9c46a" />
        <Px x={44} y={12} w={1} h={1} fill="#f4a261" />
      </g>

      {/* a happy sparkle when the plant is fully grown */}
      <g className="seed-spark">
        <Px x={25} y={8} w={1} h={3} fill="#e9c46a" />
        <Px x={24} y={9} w={3} h={1} fill="#e9c46a" />
      </g>
    </svg>
    </button>
    </div>
  );
}
