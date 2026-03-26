"use client";

import { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <FaSun className="w-3.5 h-3.5" /> : <FaMoon className="w-3.5 h-3.5" />}
    </Button>
  );
}
