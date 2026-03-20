import { forwardRef } from "react";

interface ColorInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  swatches?: string[];
  onColorSelect?: (color: string) => void;
}

const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  function ColorInput({ swatches, onColorSelect, ...props }, ref) {
    return (
      <div>
        {swatches && swatches.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1">
            {swatches.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onColorSelect?.(color)}
                className="w-5 h-5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
        <input
          ref={ref}
          type="color"
          {...props}
          className={`w-full h-8 rounded cursor-pointer ${props.className ?? ""}`}
        />
      </div>
    );
  }
);

export default ColorInput;
