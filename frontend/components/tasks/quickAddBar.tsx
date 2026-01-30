import React, { useState } from 'react';
import { useRouter } from 'next/router';

type Props = {
  selectedDate: string;
};

export default function QuickAddBar({ selectedDate }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');

  const submit = async () => {
    const title = text.trim();
    if (!title || !selectedDate) return;

    // Route to your existing create page with prefilled values
    router.push(
      `/tasks/create?date=${encodeURIComponent(selectedDate)}&title=${encodeURIComponent(title)}`
    );

    setText('');
  };

  return (
    <div className="mb-6">
      <label className="block text-xs font-bold tracking-widest text-gray-500 mb-2">
        QUICK ADD
      </label>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a task and hit Enter…"
          className="flex-1 border rounded px-3 py-2 text-sm"
          disabled={!selectedDate}
        />

        <button
          onClick={submit}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-blue-700 transition text-sm"
          disabled={!selectedDate || !text.trim()}
        >
          Add
        </button>
      </div>

      <div className="text-xs text-gray-400 mt-2">
        Tip: Press <span className="font-medium">Enter</span> to add.
      </div>
    </div>
  );
}
