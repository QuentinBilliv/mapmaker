// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { sanitizeSvg } from "../svg-sanitizer";

describe("sanitizeSvg", () => {
  it("passes through a valid SVG", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).toContain("<circle");
    expect(result).toContain("</svg>");
  });

  it("throws on invalid SVG markup", () => {
    expect(() => sanitizeSvg("<not-svg><<<")).toThrow("Invalid SVG file");
  });

  it("removes script elements", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("script");
    expect(result).toContain("rect");
  });

  it("removes iframe elements", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="evil.com"></iframe></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("iframe");
  });

  it("removes foreignObject elements", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>xss</div></foreignObject></svg>';
    const result = sanitizeSvg(svg);
    expect(result.toLowerCase()).not.toContain("foreignobject");
  });

  it("strips on* event handlers", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("onclick");
    expect(result).toContain("rect");
  });

  it("strips javascript: protocol from attributes", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>click</text></a></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("javascript:");
  });

  it("strips data:text protocol from attributes", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect data-src="data:text/html,payload" width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).toContain("rect");
    expect(result).not.toContain("data:text");
  });

  it("strips external href but keeps local references", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><use href="#icon"/><use href="https://evil.com/sprite.svg#x"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).toContain('#icon');
    expect(result).not.toContain("evil.com");
  });

  it("removes style elements with url() references", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><style>div { background: url(evil.com) }</style><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("url(");
    expect(result).toContain("rect");
  });

  it("removes animate elements", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><animate attributeName="href" values="javascript:alert(1)"/><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("animate");
    expect(result).toContain("rect");
  });

  it("removes set elements", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="onload" to="alert(1)"/><rect width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<set");
  });

  it("strips data:image URIs", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("data:");
  });

  it("strips inline style with url()", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(data:image/svg+xml;base64,PHN2Zz4=)" width="10" height="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("url(");
    expect(result).toContain("rect");
  });
});

describe("sanitizeSvg — adversarial", () => {
  function parseResult(svg: string): Document {
    const out = sanitizeSvg(svg);
    return new DOMParser().parseFromString(out, "image/svg+xml");
  }

  it("removes script with uppercase tag name", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT>alert(1)</SCRIPT></svg>');
    expect(doc.querySelector("script, SCRIPT")).toBeNull();
  });

  it("removes script with mixed-case tag name", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><ScRiPt>alert(1)</ScRiPt></svg>');
    expect(doc.getElementsByTagName("*").length).toBeLessThanOrEqual(1);
  });

  it("removes script nested deep in the tree", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><g><g><g><script>alert(1)</script></g></g></g></svg>');
    expect(doc.querySelector("script")).toBeNull();
  });

  it("strips onClick in camelCase", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><rect onClick="alert(1)" width="10" height="10"/></svg>');
    expect(doc.querySelector("rect")?.hasAttribute("onClick")).toBe(false);
    expect(doc.querySelector("rect")?.hasAttribute("onclick")).toBe(false);
  });

  it("strips ONCLICK in uppercase", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><rect ONCLICK="alert(1)" width="10" height="10"/></svg>');
    const attrs = Array.from(doc.querySelector("rect")?.attributes ?? []);
    expect(attrs.some((a) => a.name.toLowerCase().startsWith("on"))).toBe(false);
  });

  it("strips onload on the root svg element", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>');
    expect(doc.documentElement.hasAttribute("onload")).toBe(false);
  });

  it("strips javascript: when HTML-entity encoded", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><a href="&#x6A;avascript:alert(1)"><text>x</text></a></svg>');
    const a = doc.querySelector("a");
    const href = a?.getAttribute("href") ?? a?.getAttributeNS("http://www.w3.org/1999/xlink", "href") ?? "";
    expect(href.toLowerCase()).not.toContain("javascript:");
  });

  it("strips javascript: with leading whitespace", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><a href="  javascript:alert(1)"><text>x</text></a></svg>');
    expect(doc.querySelector("a")?.getAttribute("href") ?? "").not.toContain("javascript:");
  });

  it("strips javascript: with internal tab (browser bypass)", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><a href="java\tscript:alert(1)"><text>x</text></a></svg>');
    const href = doc.querySelector("a")?.getAttribute("href") ?? "";
    expect(href.replace(/\s/g, "").toLowerCase()).not.toContain("javascript:");
  });

  it("strips javascript: with internal newline", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><a href="java\nscript:alert(1)"><text>x</text></a></svg>');
    const href = doc.querySelector("a")?.getAttribute("href") ?? "";
    expect(href.replace(/\s/g, "").toLowerCase()).not.toContain("javascript:");
  });

  it("strips external href on <use>", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="https://evil.com/sprite.svg#x"/></svg>');
    const use = doc.querySelector("use");
    const xlink = use?.getAttributeNS("http://www.w3.org/1999/xlink", "href") ?? "";
    const href = use?.getAttribute("href") ?? "";
    expect(xlink + href).not.toContain("evil.com");
  });

  it("strips external src on <image> (href form)", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.com/x.png" width="10" height="10"/></svg>');
    expect(doc.querySelector("image")?.getAttribute("href") ?? "").not.toContain("evil.com");
  });

  it("strips protocol-relative href", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><a href="//evil.com/x"><text>x</text></a></svg>');
    expect(doc.querySelector("a")?.getAttribute("href") ?? "").not.toContain("evil.com");
  });

  it("removes animate that would rewrite href to javascript:", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><a href="#x"><animate attributeName="href" values="javascript:alert(1)" dur="1s"/><text>x</text></a></svg>');
    expect(doc.querySelector("animate")).toBeNull();
  });

  it("removes animateTransform", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"><animateTransform attributeName="transform" type="rotate" values="0"/></rect></svg>');
    expect(doc.querySelector("animateTransform")).toBeNull();
  });

  it("removes animateMotion", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"><animateMotion dur="1s" path="M0,0 L10,10"/></rect></svg>');
    expect(doc.querySelector("animateMotion")).toBeNull();
  });

  it("removes <object> element", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><object data="evil.swf"/></svg>');
    expect(doc.querySelector("object")).toBeNull();
  });

  it("removes <embed> element", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><embed src="evil.swf"/></svg>');
    expect(doc.querySelector("embed")).toBeNull();
  });

  it("keeps safe attributes on rect", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="10" height="10" fill="#f00" stroke="black"/></svg>');
    const rect = doc.querySelector("rect");
    expect(rect?.getAttribute("width")).toBe("10");
    expect(rect?.getAttribute("fill")).toBe("#f00");
  });

  it("keeps internal fragment href (#icon)", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><use href="#icon"/></svg>');
    expect(doc.querySelector("use")?.getAttribute("href")).toBe("#icon");
  });

  it("keeps SVG with nested groups and shapes", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><g><g><circle cx="5" cy="5" r="3"/><path d="M0,0 L10,10"/></g></g></svg>');
    expect(doc.querySelector("circle")).not.toBeNull();
    expect(doc.querySelector("path")).not.toBeNull();
  });

  it("strips data:text/html from any attribute", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="data:text/html,payload"/></svg>');
    const fill = doc.querySelector("rect")?.getAttribute("fill") ?? "";
    expect(fill.toLowerCase()).not.toContain("data:");
  });

  it("removes script inside <defs>", () => {
    const doc = parseResult('<svg xmlns="http://www.w3.org/2000/svg"><defs><script>alert(1)</script></defs><rect width="10" height="10"/></svg>');
    expect(doc.querySelector("script")).toBeNull();
  });
});
