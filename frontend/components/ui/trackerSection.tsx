/**
 * Section bodies scroll internally instead of growing the page.
 * On the stacked (mobile) layout they cap at a fraction of the viewport;
 * from `lg` up they fill whatever height their column was given.
 */
export const sectionBodyClass =
  "overflow-auto max-h-[60vh] lg:max-h-none lg:flex-1 lg:min-h-0";

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
    <section className={`flex flex-col min-h-0 h-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}>
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 transition-colors duration-150">
        <h2 className="text-[11px] font-bold tracking-widest text-gray-500 dark:text-gray-400">{title}</h2>
        {right ? <div className="text-xs text-gray-400 dark:text-gray-500">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}
