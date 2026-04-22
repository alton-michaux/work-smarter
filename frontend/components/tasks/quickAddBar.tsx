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
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-widest text-gray-500 dark:text-gray-400">
            QUICK ADD
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Add a task for{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {selectedDate ?? "…"}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
          <span className="rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 font-medium text-gray-600 dark:text-gray-300">
            Enter
          </span>
          <span>to submit</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a task…"
          disabled={!selectedDate}
          className={[
            "flex-1",
            "rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700",
            "px-3 py-2 text-sm text-gray-900 dark:text-gray-100",
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
      </div>

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        Tip: add a short title like{" "}
        <span className="font-medium text-gray-500 dark:text-gray-400">
          “Email Lucy” or “Sprint retro notes”
        </span>
        .
      </div>
    </section>
  );
}