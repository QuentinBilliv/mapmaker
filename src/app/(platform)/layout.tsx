import MigrationGuard from "@/components/providers/MigrationGuard";
import DisplayNameGate from "@/components/providers/DisplayNameGate";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MigrationGuard />
      <DisplayNameGate />
      {children}
    </>
  );
}
