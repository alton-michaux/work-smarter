import React from "react";
import { RecurringDeleteModalProps } from "types/types";

export default function ConfirmDeleteRecurringModal({
  open,
  onClose,
  onDeleteOccurrence,
  onDeleteFuture,
  onDeleteSeries,
  title = "Delete recurring task",
  body = "Do you want to delete only this occurrence, this and all future occurrences, or the entire series?",
}: RecurringDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Dialog */}
      <div className="relative mx-auto mt-32 w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="p-4 text-sm text-gray-700">
          {body}
        </div>

        <div className="p-4 border-t flex justify-end gap-2 flex-wrap">
          <button
            className="px-3 py-2 rounded-md border text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="px-3 py-2 rounded-md border text-gray-800 hover:bg-gray-50"
            onClick={onDeleteOccurrence}
            type="button"
          >
            This occurrence
          </button>

          <button
            className="px-3 py-2 rounded-md border border-orange-300 text-orange-700 hover:bg-orange-50"
            onClick={onDeleteFuture}
            type="button"
          >
            This and future
          </button>

          <button
            className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            onClick={onDeleteSeries}
            type="button"
          >
            All occurrences
          </button>
        </div>
      </div>
    </div>
  );
}
