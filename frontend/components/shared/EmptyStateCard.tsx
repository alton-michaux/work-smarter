import React from 'react';

type Action = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
};

type Props = {
  title: string;
  message?: string;
  actions?: Action[];
};

export default function EmptyStateCard({ title, message, actions = [] }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">{title}</h1>

        {message ? (
          <p className="text-sm text-gray-600 mb-6">{message}</p>
        ) : (
          <div className="mb-6" />
        )}

        {actions.length > 0 ? (
          <div className="flex justify-center gap-4">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className={
                  a.variant === 'primary'
                    ? 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
                    : 'px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition'
                }
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
