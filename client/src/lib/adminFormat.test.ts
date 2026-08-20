import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatKrw,
  formatRemaining,
} from "./adminFormat";

describe("관리자 화면 표시 형식", () => {
  it("UTC 로 온 시각을 한국 시각으로 읽는다", () => {
    // 브라우저 시간대에 맡기면 여는 곳에 따라 다른 시각이 보인다.
    // 2026-08-19T20:00Z 는 한국에서 이튿날 새벽 5시다.
    const formatted = formatDateTime("2026-08-19T20:00:00Z");

    expect(formatted).toContain("2026");
    expect(formatted).toContain("20");
    expect(formatted).toContain("05:00");
  });

  it("값이 없거나 읽을 수 없으면 화면을 깨지 않는다", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("어제")).toBe("-");
    expect(formatKrw(null)).toBe("-");
  });

  it("금액에 자릿점을 넣는다", () => {
    expect(formatKrw(29900)).toBe("29,900원");
    expect(formatKrw(0)).toBe("0원");
  });

  it("결제 만료까지 남은 시간을 분으로 보여 준다", () => {
    const now = new Date("2026-08-20T00:00:00Z");
    expect(formatRemaining("2026-08-20T00:18:00Z", now)).toBe("18분 남음");
  });

  it("이미 지난 시각은 만료로 적는다", () => {
    // 음수 분이 그대로 나오면 아직 시간이 남은 것으로 읽힌다.
    const now = new Date("2026-08-20T00:31:00Z");
    expect(formatRemaining("2026-08-20T00:30:00Z", now)).toBe("만료");
  });
});
