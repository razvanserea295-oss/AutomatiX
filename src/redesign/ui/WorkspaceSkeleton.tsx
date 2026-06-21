export default function WorkspaceSkeleton() {
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden anim-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-line shrink-0">
        <div className="h-5 w-36 rounded-lg ds-skeleton" />
        <div className="ml-auto h-7 w-20 rounded-lg ds-skeleton" style={{ animationDelay: '60ms' }} />
        <div className="h-7 w-28 rounded-lg ds-skeleton" style={{ animationDelay: '120ms' }} />
      </div>
      {/* Table header */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-line bg-surface-secondary/30 shrink-0">
        {[140, 80, 100, 70, 90].map((w, i) => (
          <div key={i} className="h-2.5 rounded-lg ds-skeleton shrink-0" style={{ width: w, animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
      {/* Table rows */}
      <div className="flex flex-col divide-y divide-line/40 overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="flex items-center gap-6 px-6 py-4 shrink-0">
            <div className="h-3.5 w-1 rounded-full bg-accent/25 animate-pulse shrink-0" />
            <div className="h-3 rounded-lg ds-skeleton flex-1" style={{ animationDelay: `${60 + i * 30}ms` }} />
            <div className="h-3 w-28 rounded-lg ds-skeleton shrink-0" style={{ animationDelay: `${90 + i * 30}ms` }} />
            <div className="h-5 w-16 rounded-full ds-skeleton shrink-0" style={{ animationDelay: `${110 + i * 30}ms` }} />
            <div className="h-3 w-16 rounded-lg ds-skeleton shrink-0" style={{ animationDelay: `${130 + i * 30}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
