













interface SkeletonProps {
  className?: string;
  
  w?: string;
  
  h?: string;
  
  circle?: boolean;
}

export function Skeleton({ className = '', w = 'w-full', h = 'h-3', circle }: SkeletonProps) {
  const shape = circle ? 'rounded-full' : 'rounded';
  return (
    <div
      className={`relative overflow-hidden bg-surface-tertiary/50 ${shape} ${w} ${h} ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </div>
  );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12'];
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} w={widths[i % widths.length]} h="h-3" />
      ))}
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-line/40">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton w={i === 0 ? 'w-3/4' : i === cols - 1 ? 'w-1/3' : 'w-2/3'} h="h-3" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
    </tbody>
  );
}

export function SkeletonList({ rows = 6, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded border border-line bg-surface-secondary p-3">
          <Skeleton w="w-8" h="h-8" circle />
          <div className="flex-1 space-y-1.5">
            <Skeleton w="w-1/2" h="h-3.5" />
            <Skeleton w="w-3/4" h="h-2.5" />
          </div>
          <Skeleton w="w-16" h="h-3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded border border-line bg-surface-secondary p-3 space-y-2">
          <Skeleton w="w-1/2" h="h-3" />
          <Skeleton w="w-3/4" h="h-5" />
          <Skeleton w="w-1/3" h="h-2.5" />
        </div>
      ))}
    </div>
  );
}





export function ListPageSkeleton({
  kpis = 3,
  rows = 8,
  cols = 5,
}: {
  kpis?: number;
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface-primary" aria-busy="true">
      <div className="h-11 border-b border-line px-5 flex items-center">
        <Skeleton w="w-40" h="h-4" />
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {kpis > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: kpis }).map((_, i) => (
              <div key={i} className="rounded border border-line bg-surface-secondary p-3 space-y-2">
                <Skeleton w="w-20" h="h-2.5" />
                <Skeleton w="w-12" h="h-5" />
              </div>
            ))}
          </div>
        )}
        <Skeleton w="w-full" h="h-9" />
        <div className="rounded border border-line bg-surface-secondary overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {Array.from({ length: cols }).map((_, i) => (
                  <th key={i} className="px-4 py-2.5"><Skeleton w="w-20" h="h-2.5" /></th>
                ))}
              </tr>
            </thead>
            <SkeletonTable rows={rows} cols={cols} />
          </table>
        </div>
      </div>
    </div>
  );
}


export default Skeleton;
