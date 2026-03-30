export const sectionMaxHeightClass = (rows: number) => {
  // Let sections with 5 or fewer items grow naturally (no scroll needed)
  if (rows <= 5) return "";
  // Cap busier sections and make them scroll
  return "max-h-72";
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