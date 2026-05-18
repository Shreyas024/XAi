export function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-surface border border-accent-red/30 rounded-lg p-6 text-center">
      <div className="text-accent-red text-lg font-medium mb-2">Something went wrong</div>
      <p className="text-text-muted text-sm mb-4">{message || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-surface2 border border-border rounded-md text-sm text-text-primary hover:bg-border transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
