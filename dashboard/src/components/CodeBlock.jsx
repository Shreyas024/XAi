export function CodeBlock({ code, lineStart = 1, highlightLine = null }) {
  if (!code) return null;

  const lines = code.split('\n');

  return (
    <div className="bg-bg border border-border rounded-lg overflow-hidden font-mono text-sm">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface2">
        <span className="w-2.5 h-2.5 rounded-full bg-accent-red/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-accent-amber/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-accent-green/60" />
      </div>
      <pre className="overflow-x-auto p-0 m-0">
        <code>
          {lines.map((line, i) => {
            const lineNum = lineStart + i;
            const isHighlighted = highlightLine && lineNum === highlightLine;
            return (
              <div
                key={i}
                className={`flex ${isHighlighted ? 'bg-accent-amber/10 border-l-2 border-accent-amber' : 'border-l-2 border-transparent'}`}
              >
                <span className="select-none text-text-muted/40 text-right w-10 pr-3 pl-3 py-0.5 flex-shrink-0">
                  {lineNum}
                </span>
                <span className={`py-0.5 pr-4 ${isHighlighted ? 'text-accent-amber' : 'text-text-primary'}`}>
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
