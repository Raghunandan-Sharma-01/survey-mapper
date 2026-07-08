/**
 * Minimal allow-list HTML sanitizer for trusted, first-party rich-text snippets
 * (e.g. QA rule items that use <strong>/<em> for emphasis).
 *
 * It parses the input and rebuilds it keeping only a small set of inline
 * formatting tags and stripping ALL attributes. Because no attributes survive,
 * every scripting vector is removed (inline event handlers, javascript: URLs,
 * <script>, etc.). Any disallowed element is replaced by its text content.
 *
 * This is intentionally conservative and dependency-free. If richer markup is
 * ever needed, swap the implementation for a vetted library such as DOMPurify.
 */

const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "CODE",
  "BR",
  "SPAN",
  "SUP",
  "SUB",
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeInlineHtml(html: string): string {
  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    // Non-DOM environment: strip every tag as a safe fallback.
    return html.replace(/<[^>]*>/g, "");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  const clean = (node: Node): string => {
    let out = "";
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += escapeHtml(child.textContent || "");
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName;
        if (ALLOWED_TAGS.has(tag)) {
          const lower = tag.toLowerCase();
          out += lower === "br" ? "<br>" : `<${lower}>${clean(el)}</${lower}>`;
        } else {
          // Drop the disallowed element but keep its (escaped) contents.
          out += clean(el);
        }
      }
    });
    return out;
  };

  return clean(doc.body);
}
