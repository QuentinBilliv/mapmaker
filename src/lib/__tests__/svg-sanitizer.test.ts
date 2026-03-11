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
});
