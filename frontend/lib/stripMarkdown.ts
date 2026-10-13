// Reduce markdown to readable plain text for compact previews where rendered
// formatting (headings, lists, code blocks) is too heavy.
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1')          // fenced code -> contents
    .replace(/`([^`]+)`/g, '$1')                          // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')             // images -> alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')              // links -> label
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')                   // headings
    .replace(/^\s{0,3}>\s?/gm, '')                        // blockquotes
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '')            // task list items
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')            // list markers
    .replace(/^\s*(?:[-*_]\s*){3,}$/gm, '')               // horizontal rules
    .replace(/(\*\*|__)(.+?)\1/g, '$2')                   // bold
    .replace(/(\*|_)(.+?)\1/g, '$2')                      // italic
    .replace(/~~(.+?)~~/g, '$1')                          // strikethrough
    .replace(/\n{2,}/g, '\n')
    .trim();
}
