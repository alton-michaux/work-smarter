import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownBodyProps } from "types/types";
import { rehypeTaskListOffsets, setTaskListItem } from "lib/taskListToggle";

export default function MarkdownBody({ value, emptyText = "No notes yet.", truncateLines, onChange }: MarkdownBodyProps) {
  const source = value ?? "";
  const text = source.trim();
  // Offsets from the parser are relative to the trimmed text.
  const lead = source.length - source.trimStart().length;

  if (!text) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      style={truncateLines ? {
        display: '-webkit-box',
        WebkitLineClamp: truncateLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      } : undefined}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={onChange ? [rehypeTaskListOffsets] : undefined}
        components={onChange ? {
          input: (allProps) => {
            const { node, ...props } = allProps;
            void node;
            const offset = Number(props['data-task-offset' as keyof typeof props]);
            if (props.type !== 'checkbox' || Number.isNaN(offset)) return <input {...props} />;
            return (
              <input
                {...props}
                disabled={false}
                className="cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChange(setTaskListItem(source, lead + offset, e.target.checked))}
              />
            );
          },
        } : undefined}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
