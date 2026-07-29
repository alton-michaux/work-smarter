import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { QuickAddProps } from "types/types";
import Button from "../ui/button"; // Add this import

export default function QuickAddBar({ selectedDate }: QuickAddProps) {
  const router = useRouter();
  const [text, setText] = useState("");

  const canSubmit = useMemo(() => {
    return Boolean(selectedDate) && Boolean(text.trim());
  }, [selectedDate, text]);

  const submit = async () => {
    const title = text.trim();
    if (!title || !selectedDate) return;

    router.push(
      `/tasks/create?date=${encodeURIComponent(
        selectedDate
      )}&title=${encodeURIComponent(title)}`
    );

    setText("");
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={
          selectedDate
            ? `Add a task for ${selectedDate} — e.g. “Email Lucy”`
            : "Add a task…"
        }
        disabled={!selectedDate}
        className={[
          "flex-1 min-w-0",
          "rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700",
          "px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed",
        ].join(" ")}
      />

      <Button
        variant="primary"
        size="sm"
        onClick={submit}
        disabled={!canSubmit}
      >
        Add
      </Button>

      <div className="hidden lg:flex shrink-0 items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
        <span className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 font-medium text-gray-600 dark:text-gray-300">
          Enter
        </span>
        <span>to submit</span>
      </div>
    </div>
  );
}