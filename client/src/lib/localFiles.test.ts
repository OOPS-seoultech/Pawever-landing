import { describe, it, expect } from "vitest";
import {
  chromeDesktop,
  folderName,
  orderFolder,
  acceptedFile,
  validateLocalFile,
  createFolders,
} from "./localFiles";
import { externalNoticeUrl } from "./adminNotices";

describe("Chrome local workspace", () => {
  it("accepts desktop Chrome on Mac and Windows, rejects Edge and mobile", () => {
    for (const platform of [
      "Macintosh; Intel Mac OS X 10_15_7",
      "Windows NT 10.0; Win64; x64",
    ]) {
      expect(
        chromeDesktop({
          userAgent: `Mozilla/5.0 (${platform}) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36`,
          vendor: "Google Inc.",
        })
      ).toBe(true);
    }
    expect(
      chromeDesktop({
        userAgent: "Chrome/140 Safari/537.36 Edg/140",
        vendor: "Google Inc.",
      })
    ).toBe(false);
    expect(
      chromeDesktop({
        userAgent: "Android Chrome/140 Mobile",
        vendor: "Google Inc.",
      })
    ).toBe(false);
    expect(
      chromeDesktop({
        userAgent: "Safari/605.1",
        vendor: "Apple Computer, Inc.",
      })
    ).toBe(false);
  });
  it("keeps order/pet identity and portable folder names", () => {
    expect(folderName("별이/검수:완료?. ")).toBe("별이_검수_완료_");
    expect(
      orderFolder({
        orderNumber: "PE-2026-000161",
        petIndex: 1,
        petName: "별이",
      })
    ).toEqual(["주문", "PE-2026-000161", "아이2_별이"]);
    expect(acceptedFile("완성.gcode.3mf")).toBe(true);
    expect(acceptedFile("정면.SVG")).toBe(true);
    expect(acceptedFile("완성.3mf.crdownload")).toBe(false);
  });
  it("creates only named directories and never writes or deletes file data", async () => {
    const created: string[] = [];
    function directory(path: string): any {
      return {
        async getDirectoryHandle(name: string, options: { create: boolean }) {
          expect(options).toEqual({ create: true });
          created.push(`${path}/${name}`);
          return directory(`${path}/${name}`);
        },
      };
    }
    await createFolders(directory("PAW-EVER"), [
      ["주문", "PE-1", "아이1_뚜비", "01_2D_4면도"],
      ["플레이트", "PB-7", "05_슬라이서_3MF_Gcode"],
    ]);
    expect(created).toContain("PAW-EVER/주문/PE-1/아이1_뚜비/01_2D_4면도");
    expect(created).toContain("PAW-EVER/플레이트/PB-7/05_슬라이서_3MF_Gcode");
  });
  it("rejects partial 3MF downloads and type mismatches", async () => {
    await expect(
      validateLocalFile(
        new File(
          [new Uint8Array([80, 75, 3, 4, 1, 2])],
          "unfinished.gcode.3mf"
        ),
        "PRINT_MODEL"
      )
    ).rejects.toThrow("완전히 저장");
    await expect(
      validateLocalFile(new File(["data"], "model.3mf"), "PRINT_MODEL")
    ).rejects.toThrow("일반 .3mf");
    await expect(
      validateLocalFile(new File(["data"], "model.gcode.3mf"), "MODEL_SOURCE")
    ).rejects.toThrow("출력 파일");
    await expect(
      validateLocalFile(new File(["gcode"], "model.gcode"), "MODEL_SOURCE")
    ).rejects.toThrow("확장자");
    await expect(
      validateLocalFile(new File(["G28"], "plate.gcode"), "PLATE")
    ).resolves.toBeUndefined();
    await expect(
      validateLocalFile(new File([], "empty.3mf"), "PRINT_MODEL")
    ).rejects.toThrow("0바이트");
  });
});
describe("notice links", () => {
  it("allows only external HTTPS URLs and refuses scripts, local paths, credentials", () => {
    expect(externalNoticeUrl("https://example.com/guide")).toBe(
      "https://example.com/guide"
    );
    for (const value of [
      "javascript:alert(1)",
      "data:image/svg+xml,<svg/>",
      "file:///Users/mu/private",
      "http://example.com",
      "/admin/orders",
      "https://name:password@example.com",
    ])
      expect(externalNoticeUrl(value)).toBeUndefined();
  });
});
