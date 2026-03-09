"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue>({
  value: "",
  onValueChange: () => {},
})

function Select({
  value,
  onValueChange,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  )
}

function SelectTrigger({
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <>{children}</>
}

function SelectValue() {
  return null
}

function SelectContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { value, onValueChange } = React.useContext(SelectContext)

  const options = React.useMemo(() => {
    const items: { value: string; label: string }[] = []
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<{ value: string; children: React.ReactNode }>(child)) {
        items.push({
          value: child.props.value,
          label: String(child.props.children ?? child.props.value),
        })
      }
    })
    return items
  }, [children])

  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SelectItem(_props: { value: string; children: React.ReactNode }) {
  return null
}

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}
