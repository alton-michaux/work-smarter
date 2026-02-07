export const sectionMaxHeightClass = (rows: number) => {
  // tune these numbers however you like
  if (rows <= 2) return "max-h-32";   // very small weeks
  if (rows <= 5) return "max-h-48";   // normal weeks
  if (rows <= 9) return "max-h-64";   // busy weeks
  return "max-h-[28vh]";             // very busy weeks (viewport-based cap)
};

export function SectionPanel({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded border bg-white ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <h2 className="text-[11px] font-bold tracking-widest text-gray-500">{title}</h2>
        {right ? <div className="text-xs text-gray-400">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}