"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navbar() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getMe);

  return (
    <nav className="h-12 border-b bg-background flex items-center px-4 shrink-0">
      <Link href={isAuthenticated ? "/dashboard" : "/"} className="font-semibold text-sm mr-6">
        idomap
      </Link>
      <Link
        href="/maps"
        className="text-sm text-muted-foreground hover:text-foreground mr-4"
      >
        Public maps
      </Link>
      <div className="flex-1" />
      <ThemeToggle />
      {isAuthenticated ? (
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {me?.name ?? "Account"}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="text-xs">
              Sign up
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
