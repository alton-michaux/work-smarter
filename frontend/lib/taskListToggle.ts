import type { Element, Root } from 'hast';

// Rehype plugin: stamp each GFM task-list checkbox with the source offset of
// its list item, so a click can be mapped back to the exact `[ ]` in the
// markdown (code blocks and look-alike text never get matched by accident).
export function rehypeTaskListOffsets() {
  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        const offset = child.position?.start.offset;
        if (child.tagName === 'li' && offset !== undefined) {
          const input = findCheckbox(child);
          if (input) input.properties.dataTaskOffset = offset;
        }
        walk(child);
      }
    };
    walk(tree);
  };
}

// The checkbox is a direct child of the <li>, or of its first <p> in a loose list.
function findCheckbox(li: Element): Element | undefined {
  for (const child of li.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'input') return child;
    if (child.tagName === 'p') {
      return child.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'input'
      );
    }
    return undefined;
  }
  return undefined;
}

const TASK_MARKER = /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+)\[[ xX]\]/;

// Set the task-list item starting at `offset` to checked/unchecked. Returns the
// markdown unchanged if no task marker is found there.
export function setTaskListItem(markdown: string, offset: number, checked: boolean): string {
  const rest = markdown.slice(offset);
  const match = rest.match(TASK_MARKER);
  if (!match) return markdown;
  return markdown.slice(0, offset) + rest.replace(TASK_MARKER, `$1[${checked ? 'x' : ' '}]`);
}
