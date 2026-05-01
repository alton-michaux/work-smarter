import React from 'react';

type SearchBarProps = {
  value: string;
  onChange: (q: string) => void;
  isSearching: boolean;
  onClear: () => void;
};

export default function SearchBar({ value, onChange, isSearching, onClear }: SearchBarProps) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none">
        {isSearching ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        )}
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tasks…"
        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-400 dark:placeholder-gray-500"
      />

      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Clear search"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
