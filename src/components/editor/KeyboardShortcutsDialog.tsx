"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaKeyboard } from "react-icons/fa6";

const SECTIONS = [
  {
    title: "Drawing tools",
    shortcuts: [
      { keys: ["V"], desc: "Select mode" },
      { keys: ["P"], desc: "Polygon" },
      { keys: ["L"], desc: "Polyline" },
      { keys: ["M"], desc: "Point (marker)" },
      { keys: ["R"], desc: "Rectangle" },
      { keys: ["C"], desc: "Circle" },
      { keys: ["T"], desc: "Text" },
    ],
  },
  {
    title: "Drawing",
    shortcuts: [
      { keys: ["Enter"], desc: "Finish shape" },
      { keys: ["Escape"], desc: "Cancel drawing" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: ["Ctrl", "Z"], desc: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], desc: "Redo" },
      { keys: ["Ctrl", "D"], desc: "Duplicate" },
      { keys: ["Delete"], desc: "Delete selected" },
      { keys: ["Escape"], desc: "Deselect" },
    ],
  },
];

export default function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false);
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
      >
        <FaKeyboard className="text-sm" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-h-[80vh] overflow-y-auto bg-popover border rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              {SECTIONS.map((section) => (
                <div key={section.title}>
                  <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{section.title}</h3>
                  <div className="space-y-1.5">
                    {section.shortcuts.map((s) => (
                      <div key={s.desc} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{s.desc}</span>
                        <div className="flex gap-1">
                          {s.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded bg-muted border text-[10px] font-mono text-muted-foreground"
                            >
                              {key === "Ctrl" ? (isMac ? "⌘" : "Ctrl") : key === "Shift" ? (isMac ? "⇧" : "Shift") : key === "Delete" ? (isMac ? "⌫" : "Del") : key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t">
              <p className="text-[10px] text-muted-foreground text-center">Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px] font-mono">?</kbd> to toggle</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
