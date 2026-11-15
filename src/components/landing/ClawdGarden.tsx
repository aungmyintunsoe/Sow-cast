/**
 * A small pixel-art scene for the Claude skill sections: Clawd (Claude Code's mascot) hops and blinks while a
 * little rain cloud waters a seedling that grows in three steps, then the loop starts over.
 * Pure SVG + CSS (steps() timing for a pixel feel); static when the visitor prefers reduced motion.
 * Clawd is Anthropic's mascot; check Anthropic's brand guidelines before public use, or delete this component.
 */
const ORANGE = '#D97757';
const DARK = '#1c1917';

function Px({ x, y, w = 1, h = 1, fill }: { x: number; y: number; w?: number; h?: number; fill: string }) {
  return <rect x={x} y={y} width={w} height={h} fill={fill} />;
}

export function ClawdGarden({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 30"
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Pixel-art Clawd hopping beside a seedling that grows under a small rain cloud"
    >
      {/* ground */}
      <Px x={0} y={26} w={64} h={1} fill="#8b6b4c" />
      <Px x={0} y={27} w={64} h={3} fill="#a7845f" />

      {/* ---- Clawd ---- */}
      <g className="clawd-hop">
        {/* body */}
        <Px x={6} y={12} w={14} h={8} fill={ORANGE} />
        {/* arms */}
        <Px x={4} y={15} w={2} h={2} fill={ORANGE} />
        <g className="clawd-wave">
          <Px x={20} y={15} w={2} h={2} fill={ORANGE} />
        </g>
        {/* eyes */}
        <g className="clawd-blink">
          <Px x={9} y={14} w={1} h={3} fill={DARK} />
          <Px x={16} y={14} w={1} h={3} fill={DARK} />
        </g>
        {/* legs, two frames that alternate */}
        <g className="clawd-legs-a">
          <Px x={7} y={20} w={1} h={3} fill={ORANGE} />
          <Px x={10} y={20} w={1} h={3} fill={ORANGE} />
          <Px x={15} y={20} w={1} h={3} fill={ORANGE} />
          <Px x={18} y={20} w={1} h={3} fill={ORANGE} />
        </g>
        <g className="clawd-legs-b">
          <Px x={8} y={20} w={1} h={3} fill={ORANGE} />
          <Px x={11} y={20} w={1} h={3} fill={ORANGE} />
          <Px x={14} y={20} w={1} h={3} fill={ORANGE} />
          <Px x={17} y={20} w={1} h={3} fill={ORANGE} />
        </g>
      </g>
      {/* Clawd's shadow */}
      <Px x={7} y={25} w={12} h={1} fill="#00000022" />

      {/* ---- rain cloud ---- */}
      <g className="clawd-cloud">
        <Px x={38} y={3} w={12} h={3} fill="#e7e5e4" />
        <Px x={40} y={1} w={6} h={2} fill="#e7e5e4" />
        <Px x={37} y={4} w={14} h={2} fill="#d6d3d1" />
        <g className="clawd-rain">
          <Px x={40} y={8} w={1} h={2} fill="#60a5fa" />
          <Px x={44} y={10} w={1} h={2} fill="#60a5fa" />
          <Px x={48} y={7} w={1} h={2} fill="#60a5fa" />
        </g>
        <g className="clawd-rain clawd-rain-2">
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
      <g className="clawd-spark">
        <Px x={25} y={8} w={1} h={3} fill="#e9c46a" />
        <Px x={24} y={9} w={3} h={1} fill="#e9c46a" />
      </g>
    </svg>
  );
}
