import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { QuickAddProps } from "types/types";

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
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-widest text-gray-500">
            QUICK ADD
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Add a task for{" "}
            <span className="font-medium text-gray-700">
              {selectedDate ?? "…"}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400">
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
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
            "rounded-md border border-gray-200 bg-white",
            "px-3 py-2 text-sm text-gray-900",
            "placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
          ].join(" ")}
        />

        <button
          onClick={submit}
          disabled={!canSubmit}
          className={[
            "rounded-md px-4 py-2 text-sm font-medium",
            "bg-blue-600 text-white hover:bg-blue-700",
            "transition",
            "disabled:bg-blue-300 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          Add
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        Tip: add a short title like{" "}
        <span className="font-medium text-gray-500">
          “Email Lucy” or “Sprint retro notes”
        </span>
        .
      </div>
    </section>
  );
}