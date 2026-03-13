import { Slider } from "@/components/ui/slider";

export default function SliderField({
  value,
  onChange,
  min,
  max,
  step,
  scale,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  scale?: number;
  className?: string;
}) {
  const displayed = scale ? Math.round(value * scale) : value;

  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={[displayed]}
      onValueChange={(v: number[]) => onChange(scale ? v[0] / scale : v[0])}
      className={className}
    />
  );
}
