const FORBIDDEN_ELEMENTS = new Set([
  "script", "foreignobject", "iframe", "embed", "object",
  "animate", "animatetransform", "animatemotion", "set",
]);

export function sanitizeSvg(raw: string): string {
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  const error = doc.querySelector("parsererror");
  if (error) throw new Error("Invalid SVG file");

  walk(doc.documentElement);
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function walk(el: Element) {
  const toRemove: Element[] = [];

  for (const child of Array.from(el.children)) {
    if (FORBIDDEN_ELEMENTS.has(child.tagName.toLowerCase())) {
      toRemove.push(child);
      continue;
    }

    if (
      child.tagName.toLowerCase() === "style" &&
      child.textContent?.includes("url(")
    ) {
      toRemove.push(child);
      continue;
    }

    stripAttributes(child);
    walk(child);
  }

  for (const node of toRemove) el.removeChild(node);
}

function stripAttributes(el: Element) {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value.toLowerCase().trim();

    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (value.startsWith("javascript:") || value.startsWith("data:")) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (name === "style" && value.includes("url(")) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (
      (name === "href" || name === "xlink:href") &&
      !value.startsWith("#")
    ) {
      el.removeAttribute(attr.name);
    }
  }
}
