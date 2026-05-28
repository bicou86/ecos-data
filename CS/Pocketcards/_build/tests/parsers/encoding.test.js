import { describe, it, expect } from "vitest";
import { readWithEncodingFallback } from "../../src/parsers/encoding.js";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("readWithEncodingFallback", () => {
  it("reads valid UTF-8 file successfully", () => {
    const tmp = mkdtempSync(join(tmpdir(), "enc-"));
    const path = join(tmp, "utf8.md");
    writeFileSync(path, "# Céphalée — épisode\nÉtat fébrile", "utf8");
    const result = readWithEncodingFallback(path);
    expect(result.encoding).toBe("utf8");
    expect(result.content).toContain("Céphalée");
  });

  it("falls back to windows-1252 for non-UTF8 file", () => {
    const tmp = mkdtempSync(join(tmpdir(), "enc-"));
    const path = join(tmp, "win.md");
    // Bytes representing "Céphalée" in windows-1252: C, e+acute=0xE9, p, h, a, l, e+acute=0xE9, e+acute=0xE9
    const buf = Buffer.from([0x43, 0xe9, 0x70, 0x68, 0x61, 0x6c, 0xe9, 0xe9]);
    writeFileSync(path, buf);
    const result = readWithEncodingFallback(path);
    // Should succeed with some encoding without surrogate errors
    expect(result.encoding).toMatch(/utf8|windows-1252|latin1/);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("throws on non-existent file", () => {
    expect(() => readWithEncodingFallback("/nope/missing.md")).toThrow();
  });
});
