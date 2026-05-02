import { useState } from 'react';
import { GeneratedResume } from 'types/types';

type Props = {
  data: GeneratedResume;
  onRegenerate: () => void;
  onDownload: () => Promise<void>;
  isRegenerating: boolean;
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

function renderMarkdown(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return (
        <h1 key={i} className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={i} className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-1 border-b border-gray-200 dark:border-gray-700 pb-1">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h3 key={i} className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-3 mb-0.5">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc">
          {line.slice(2)}
        </li>
      );
    }
    if (line.trim() === '') {
      return <div key={i} className="h-1" />;
    }
    return (
      <p key={i} className="text-sm text-gray-700 dark:text-gray-300">
        {line}
      </p>
    );
  });
}

export default function ResumeGenerationPanel({ data, onRegenerate, onDownload, isRegenerating }: Props) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(data.content);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI-Generated Resume</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            type="button"
          >
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
            type="button"
          >
            {downloading ? 'Preparing…' : 'Download DOCX'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        {editing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            style={{ minHeight: '60vh' }}
          />
        ) : (
          <div className="prose-sm max-w-none">
            {renderMarkdown(editing ? editedContent : data.content)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>
          Generated {formatRelativeTime(data.updated_at)} &middot;{' '}
          {data.is_cached ? 'Cached' : 'Fresh'}
        </span>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition underline"
          type="button"
        >
          {isRegenerating ? 'Regenerating…' : 'Regenerate'}
        </button>
      </div>
    </div>
  );
}
