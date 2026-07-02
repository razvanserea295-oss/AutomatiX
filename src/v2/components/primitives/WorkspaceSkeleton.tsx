export default function WorkspaceSkeleton() {
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-line shrink-0">
        <div className="h-5 w-36 rounded-lg bg-surface-tertiary" />
        <div className="ml-auto h-7 w-20 rounded-lg bg-surface-tertiary" />
        <div className="h-7 w-28 rounded-lg bg-surface-tertiary" />
      </div>
      <div className="flex items-center gap-6 px-6 py-3 border-b border-line bg-surface-secondary/30 shrink-0">
        {[140, 80, 100, 70, 90].map((w, i) => (
          <div key={i} className="h-2.5 rounded-lg bg-surface-tertiary shrink-0" style={{ width: w }} />
        ))}
      </div>
      <div className="flex flex-col divide-y divide-line/40 overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="flex items-center gap-6 px-6 py-4 shrink-0">
            <div className="h-3.5 w-1 rounded-full bg-accent/25 shrink-0" />
            <div className="h-3 rounded-lg bg-surface-tertiary flex-1" />
            <div className="h-3 w-28 rounded-lg bg-surface-tertiary shrink-0" />
            <div className="h-5 w-16 rounded-full bg-surface-tertiary shrink-0" />
            <div className="h-3 w-16 rounded-lg bg-surface-tertiary shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
