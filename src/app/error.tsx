"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <span className="font-serif text-8xl font-bold text-muted-foreground/20">500</span>
      <h1 className="text-xl font-semibold mt-4">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        An unexpected error occurred. This has been logged and we&apos;ll look into it.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
