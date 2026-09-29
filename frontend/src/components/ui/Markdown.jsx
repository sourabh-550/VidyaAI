// Renders a small, safe subset of markdown for chat answers: paragraphs,
// line breaks, **bold**, *italics*, bullet and numbered lists (with one level of
// nesting), and `inline code`. Output is built from React elements only (never
// an HTML string), so raw HTML in the text is shown as plain text. Headings,
// tables, links and horizontal rules are not rendered as markdown.

const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const NUMBERED = /^(\s*)(\d+)[.)]\s+(.*)$/;
const HEADING = /^\s{0,3}#{1,6}\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const CONTINUATION = /^\s{2,}\S/;

// `code` | **bold** / __bold__ | *italic* / _italic_
const INLINE = "`([^`]+)`|(\\*\\*|__)(\\S(?:.*?\\S)?)\\2|(\\*|_)(\\S(?:.*?\\S)?)\\4";

const isWordChar = (c) => !!c && /[A-Za-z0-9]/.test(c);
const indentOf = (ws) => ws.replace(/\t/g, "    ").length;

function matchItem(line) {
  const bullet = line.match(BULLET);
  if (bullet) return { type: "ul", indent: indentOf(bullet[1]), text: bullet[2] };
  const numbered = line.match(NUMBERED);
  if (numbered) {
    return {
      type: "ol",
      indent: indentOf(numbered[1]),
      text: numbered[3],
      start: Number(numbered[2]),
    };
  }
  return null;
}

// A list item is { lines: [...], sub: null | { type, start, items: [[...lines]] } }.
function parseBlocks(text) {
  const blocks = [];
  let para = null;
  let list = null;
  let prevBlank = false;

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim() || RULE.test(line)) {
      para = null;
      prevBlank = true;
      continue;
    }

    const item = matchItem(line);
    if (item) {
      const parent = list?.items[list.items.length - 1];
      if (parent && item.indent >= list.indent + 2) {
        // Indented under an item: one nested level. Deeper indents join it too.
        if (!parent.sub) parent.sub = { type: item.type, start: item.start, items: [] };
        parent.sub.items.push([item.text]);
      } else {
        // A blank line between items of the same kind keeps one list.
        if (!list || list.type !== item.type) {
          list = { type: item.type, start: item.start, indent: item.indent, items: [] };
          blocks.push(list);
        }
        list.items.push({ lines: [item.text], sub: null });
      }
      para = null;
      prevBlank = false;
      continue;
    }

    // Indented line right after a list item continues that item (or its
    // last nested item).
    if (list && !prevBlank && CONTINUATION.test(line)) {
      const parent = list.items[list.items.length - 1];
      const target = parent.sub ? parent.sub.items[parent.sub.items.length - 1] : parent.lines;
      target.push(line.trim());
      continue;
    }

    list = null;
    prevBlank = false;
    const heading = line.match(HEADING);
    if (!para) {
      para = { type: "p", lines: [] };
      blocks.push(para);
    }
    para.lines.push(heading ? heading[1] : line.trim());
  }

  return blocks;
}

function renderInline(text, key) {
  const re = new RegExp(INLINE, "g");
  const out = [];
  let last = 0;
  let m;

  while ((m = re.exec(text))) {
    const delim = m[2] || m[4];
    // Underscores inside words (snake_case) aren't emphasis.
    if (
      delim?.[0] === "_" &&
      (isWordChar(text[m.index - 1]) || isWordChar(text[re.lastIndex]))
    ) {
      re.lastIndex = m.index + 1;
      continue;
    }

    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${m.index}`;
    if (m[1] !== undefined) {
      out.push(
        <code
          key={k}
          className="rounded border border-border bg-bg px-1 py-0.5 font-mono text-[0.9em]"
        >
          {m[1]}
        </code>
      );
    } else if (m[2]) {
      out.push(
        <strong key={k} className="font-semibold">
          {renderInline(m[3], k)}
        </strong>
      );
    } else {
      out.push(<em key={k}>{renderInline(m[5], k)}</em>);
    }
    last = re.lastIndex;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderLines(lines, key) {
  return lines.map((line, i) => (
    <span key={`${key}-${i}`}>
      {i > 0 && <br />}
      {renderInline(line, `${key}-${i}`)}
    </span>
  ));
}

export default function Markdown({ text }) {
  const blocks = parseBlocks(String(text ?? ""));

  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        if (block.type === "p") {
          return <p key={bi}>{renderLines(block.lines, bi)}</p>;
        }
        return (
          <List key={bi} list={block}>
            {block.items.map((item, ii) => (
              <li key={ii}>
                {renderLines(item.lines, `${bi}-${ii}`)}
                {item.sub && (
                  <List list={item.sub} nested>
                    {item.sub.items.map((lines, si) => (
                      <li key={si}>{renderLines(lines, `${bi}-${ii}-${si}`)}</li>
                    ))}
                  </List>
                )}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

function List({ list, nested = false, children }) {
  const Tag = list.type;
  const marker =
    Tag === "ol" ? "list-decimal" : nested ? "list-[circle]" : "list-disc";
  return (
    <Tag
      start={Tag === "ol" ? list.start : undefined}
      className={`space-y-1 pl-5 marker:text-muted ${marker} ${nested ? "mt-1" : ""}`}
    >
      {children}
    </Tag>
  );
}
