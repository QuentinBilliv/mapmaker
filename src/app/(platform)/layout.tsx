import MigrationGuard from "@/components/providers/MigrationGuard";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MigrationGuard />
      {children}
    </>
  );
}
