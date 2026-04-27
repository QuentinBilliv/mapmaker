import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showCounter?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, maxLength, onInput, showCounter = true, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)
    const [len, setLen] = React.useState(0)
    const hasCounter = showCounter && maxLength !== undefined

    React.useEffect(() => {
      const current = innerRef.current?.value.length ?? 0
      setLen((prev) => (prev === current ? prev : current))
    })

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      setLen((e.target as HTMLInputElement).value.length)
      onInput?.(e)
    }

    const inputEl = (
      <input
        type={type}
        maxLength={maxLength}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={innerRef}
        onInput={hasCounter ? handleInput : onInput}
        {...props}
      />
    )

    if (!hasCounter) return inputEl

    return (
      <div>
        {inputEl}
        <div className="text-right text-[10px] text-muted-foreground/60 mt-0.5 pr-1">
          {len}/{maxLength}
        </div>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
