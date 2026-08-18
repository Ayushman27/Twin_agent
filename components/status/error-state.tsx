export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm">
      <p className="text-red-500">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1.5 rounded-md border border-border text-sm">
          Retry
        </button>
      )}
    </div>
  );
}
