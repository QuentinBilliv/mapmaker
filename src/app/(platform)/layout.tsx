import Navbar from "@/components/layout/Navbar";
import MigrationGuard from "@/components/providers/MigrationGuard";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <MigrationGuard />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
