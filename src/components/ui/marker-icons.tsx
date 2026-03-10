import type { PointShape } from "@/lib/types";

const S = 20;

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width={16} height={16} fill="currentColor" stroke="none">
      {children}
    </svg>
  );
}

const SHAPE_SVGS: Record<PointShape, React.ReactNode> = {
  circle: <Svg><circle cx={10} cy={10} r={8} /></Svg>,
  triangle: <Svg><polygon points="10,2 18,18 2,18" /></Svg>,
  square: <Svg><rect x={2} y={2} width={16} height={16} /></Svg>,
  diamond: <Svg><polygon points="10,1 19,10 10,19 1,10" /></Svg>,
  star: (
    <Svg>
      <polygon points="10,1 12.5,7.5 19,8 14,12.5 15.5,19 10,15.5 4.5,19 6,12.5 1,8 7.5,7.5" />
    </Svg>
  ),
  cross: (
    <Svg>
      <polygon points="7,2 13,2 13,7 18,7 18,13 13,13 13,18 7,18 7,13 2,13 2,7 7,7" />
    </Svg>
  ),
};

export function ShapePreview({ shape }: { shape: PointShape }) {
  return <>{SHAPE_SVGS[shape]}</>;
}
