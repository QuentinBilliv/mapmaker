"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isEmbed = pathname.startsWith("/embed");

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {isEmbed ? (
        children
      ) : (
        <div className="h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
        </div>
      )}
      <Toaster position="bottom-center" />
    </ConvexAuthNextjsProvider>
  );
}
