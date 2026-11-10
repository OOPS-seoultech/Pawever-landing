import { describe, it, expect } from "vitest";
import { adminLoginPath, adminReturnPath } from "./adminImageGeneration";
describe("mobile image-review sign-in return path", () => {
  it("preserves only the supported admin destinations", () => {
    expect(adminLoginPath("/admin/image-review/job-1")).toBe(
      "/admin?next=%2Fadmin%2Fimage-review%2Fjob-1"
    );
    expect(adminReturnPath("?next=%2Fadmin%2Ftelegram")).toBe(
      "/admin/telegram"
    );
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/admin/../outside",
      "/admin/orders/1",
      "/admin/image-review/a?bad=1",
    ]) {
      expect(adminReturnPath(`?next=${encodeURIComponent(path)}`)).toBeNull();
    }
  });
});
