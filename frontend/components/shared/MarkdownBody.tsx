import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownBodyProps } from "types/types";

export default function MarkdownBody({ value, emptyText = "No notes yet." }: MarkdownBodyProps) {
  const text = (value ?? "").trim();

  if (!text) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}