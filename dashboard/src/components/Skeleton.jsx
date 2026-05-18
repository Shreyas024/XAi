export function Skeleton({ className = '', lines = 1 }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-shimmer rounded-md h-4 mb-2 last:mb-0"
          style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <Skeleton className="mb-4" />
      <div className="skeleton-shimmer rounded-md h-8 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="border-b border-border p-4">
        <Skeleton className="w-48" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-4 border-b border-border last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex-1">
              <div className="skeleton-shimmer rounded-md h-4" style={{ width: `${60 + Math.random() * 40}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
