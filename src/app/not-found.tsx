import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <span className="font-serif text-8xl font-bold text-muted-foreground/20">404</span>
      <h1 className="text-xl font-semibold mt-4">Page not found</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        This page doesn&apos;t exist or has been moved. If you were looking for a map, it may have been deleted or set to private.
      </p>
      <div className="flex gap-3 mt-6">
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/maps"
          className="inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          Browse maps
        </Link>
      </div>
    </div>
  );
}
