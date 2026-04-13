"use client";

import Link from "next/link";
import { FaMap, FaDesktop } from "react-icons/fa6";

export default function MobileEditorNotice() {
  return (
    <div className="md:hidden flex-1 flex items-center justify-center p-6 bg-background">
      <div className="max-w-sm w-full flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <FaDesktop className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Editor works best on desktop</h1>
          <p className="text-sm text-muted-foreground">
            idomap needs precise drawing and a wider screen. Open this page on
            a computer to create and edit maps.
          </p>
        </div>
        <div className="w-full flex flex-col gap-2">
          <Link
            href="/maps"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FaMap className="w-4 h-4" />
            Browse public maps
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
