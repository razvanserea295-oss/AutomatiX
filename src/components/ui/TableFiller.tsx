interface TableFillerProps {
  
  cols: number;
  
  count: number;
  
  rowHeight?: number;
}












export default function TableFiller({ cols, count, rowHeight = 44 }: TableFillerProps) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`__ghost_${i}`} className="border-b border-line/40 last:border-b-0 pointer-events-none">
          <td colSpan={cols} style={{ height: rowHeight }} aria-hidden />
        </tr>
      ))}
    </>
  );
}
