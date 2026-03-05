import MarkdownBody from "./MarkdownBody";
import { MarkdownEditProps } from "types/types";

export default function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder = "Write notes in Markdown…",
  helpText = "",
}: MarkdownEditProps) {
  const showHeader = Boolean(label || helpText);

  const panelBase =
    "border border-gray-200 rounded-lg bg-white shadow-sm";
  const panelHeader =
    "px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-600 bg-gray-50";
  const focusRing =
    "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2";

  return (
    <div className="space-y-3">
      {showHeader ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? (
            <label className="text-sm font-semibold text-gray-900">{label}</label>
          ) : (
            <span />
          )}
          {helpText ? <span className="text-xs text-gray-500">{helpText}</span> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div className={`${panelBase} ${focusRing} flex flex-col`}>
          <div className={panelHeader}>Write</div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full flex-1 resize-y p-3 text-sm text-gray-900 outline-none"
          />
          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            Tip: <span className="font-medium">- [ ]</span> creates a checkbox.{" "}
            <span className="font-medium">```</span> starts a code block.
          </div>
        </div>

        {/* Preview */}
        <div className={panelBase}>
          <div className={panelHeader}>Preview</div>
          <div className="p-3 min-h-[18rem] max-h-[24rem] overflow-auto">
            <MarkdownBody value={value} emptyText="Nothing to preview yet." />
          </div>
        </div>
      </div>
    </div>
  );
}
