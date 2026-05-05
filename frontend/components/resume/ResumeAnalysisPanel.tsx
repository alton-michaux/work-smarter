import { ResumeAnalysis } from 'types/types';

type Props = {
  data: ResumeAnalysis;
  onRefresh: () => void;
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score / 10, 0), 1) * 100;
  const color =
    score >= 8 ? 'bg-green-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
        {score.toFixed(1)} / 10
      </span>
    </div>
  );
}

export default function ResumeAnalysisPanel({ data, onRefresh }: Props) {
  const hasBulletRewrites = Object.keys(data.bullet_rewrites).length > 0;

  return (
    <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Analysis</h2>
        </div>
        <ScoreBar score={data.score} />
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Summary */}
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.summary}</p>

        {/* Suggestions */}
        {data.suggestions.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Suggestions
            </h3>
            <ol className="space-y-2">
              {data.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="shrink-0 font-medium text-gray-400 dark:text-gray-500">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Accomplishments to add */}
        {data.accomplishments.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Accomplishments to add
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 italic">
              Based on your work history, consider adding:
            </p>
            <ul className="space-y-2">
              {data.accomplishments.map((a, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 dark:text-gray-300 pl-3 border-l-2 border-violet-400 dark:border-violet-600"
                >
                  {a}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Bullet rewrites */}
        {hasBulletRewrites && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Bullet rewrites
            </h3>
            <div className="space-y-3">
              {Object.entries(data.bullet_rewrites).map(([original, improved], i) => (
                <div key={i} className="rounded-md border border-gray-100 dark:border-gray-700 overflow-hidden text-sm">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 line-through">
                    {original}
                  </div>
                  <div className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">
                    {improved}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>
          Analyzed {formatRelativeTime(data.analyzed_at)} &middot;{' '}
          {data.is_cached ? 'Cached' : 'Fresh'}
        </span>
        <button
          onClick={onRefresh}
          className="hover:text-gray-600 dark:hover:text-gray-300 transition underline"
          type="button"
        >
          Re-analyze
        </button>
      </div>
    </div>
  );
}
