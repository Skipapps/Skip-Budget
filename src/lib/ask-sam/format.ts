export type Span = { text: string; bold: boolean };

export type Block =
  | { type: 'paragraph'; spans: Span[] }
  | { type: 'bullets'; items: Span[][] }
  | { type: 'steps'; items: Span[][] };

/** Splits an answer into paragraphs, bullet lists and numbered steps, with **bold** runs. */
export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    let paragraph: string[] = [];
    const flush = () => {
      if (paragraph.length) blocks.push({ type: 'paragraph', spans: spans(paragraph.join(' ')) });
      paragraph = [];
    };
    for (const line of lines) {
      const bullet = /^[-•]\s+(.*)$/.exec(line);
      const step = /^\d+[.)]\s+(.*)$/.exec(line);
      if (bullet || step) {
        flush();
        const type = bullet ? 'bullets' : 'steps';
        const item = spans((bullet ?? step)![1]);
        const last = blocks[blocks.length - 1];
        if (last && last.type === type) last.items.push(item);
        else blocks.push({ type, items: [item] } as Block);
      } else {
        paragraph.push(line);
      }
    }
    flush();
  }
  return blocks;
}

export function spans(text: string): Span[] {
  const out: Span[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  let found: RegExpExecArray | null;
  while ((found = pattern.exec(text))) {
    if (found.index > last) out.push({ text: text.slice(last, found.index), bold: false });
    out.push({ text: found[1], bold: true });
    last = found.index + found[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false });
  return out;
}

/** The answer as plain text, for screen readers and the contact form's copy of the chat. */
export function plainText(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}
