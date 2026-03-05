import MarkdownBody from "./MarkdownBody";
import { MarkdownEditProps } from "types/types";

export default function MarkdownEditor({
  label = "Description",
  value,
  onChange,
  placeholder = "Write notes in Markdown…",
  helpText = "Supports Markdown (lists, checkboxes, code blocks).",
}: MarkdownEditProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-semibold text-gray-900">{label}</label>
        <span className="text-xs text-gray-500">{helpText}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-600">
            Write
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-72 resize-y p-3 text-sm text-gray-900 outline-none"
          />
        </div>

        {/* Preview */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-600">
            Preview
          </div>
          <div className="p-3 max-h-72 overflow-auto">
            <MarkdownBody value={value} emptyText="Nothing to preview yet." />
          </div>
        </div>
      </div>
    </div>
  );
}