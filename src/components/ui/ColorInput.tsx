import { forwardRef } from "react";

const ColorInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function ColorInput(props, ref) {
  return (
    <input
      ref={ref}
      type="color"
      {...props}
      className={`w-full h-8 rounded cursor-pointer ${props.className ?? ""}`}
    />
  );
});

export default ColorInput;
