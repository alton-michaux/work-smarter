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
    <section className={`mb-3 rounded border bg-white ${className}`}>
      <div className="flex items-baseline justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-xs font-bold tracking-widest text-gray-500">{title}</h2>
        {right ? <div className="text-xs text-gray-400">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}