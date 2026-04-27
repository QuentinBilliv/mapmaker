import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, maxLength, onInput, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement>(null)
  React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)
  const [len, setLen] = React.useState(0)
  const showCounter = maxLength !== undefined

  React.useEffect(() => {
    const current = innerRef.current?.value.length ?? 0
    setLen((prev) => (prev === current ? prev : current))
  })

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    setLen((e.target as HTMLTextAreaElement).value.length)
    onInput?.(e)
  }

  const textareaEl = (
    <textarea
      maxLength={maxLength}
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={innerRef}
      onInput={showCounter ? handleInput : onInput}
      {...props}
    />
  )

  if (!showCounter) return textareaEl

  return (
    <div>
      {textareaEl}
      <div className="text-right text-[10px] text-muted-foreground/60 mt-0.5 pr-1">
        {len}/{maxLength}
      </div>
    </div>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
