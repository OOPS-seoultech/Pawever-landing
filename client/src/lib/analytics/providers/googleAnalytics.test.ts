import { afterEach, describe, expect, it } from "vitest";
import { setGoogleConsent } from "./googleAnalytics";

type Stubbed = { window?: unknown };

const globals = globalThis as Stubbed;
const originalWindow = globals.window;

afterEach(() => {
  if (originalWindow === undefined) delete globals.window;
  else globals.window = originalWindow;
});

describe("gtag 셔임", () => {
  it("dataLayer에 배열이 아니라 arguments 객체를 넣는다", () => {
    // gtag.js는 dataLayer 항목이 arguments 객체일 때만 명령으로 처리한다.
    // 배열을 넣으면 명령이 조용히 무시돼 GA4에 이벤트가 한 건도 남지 않는다.
    globals.window = {};

    setGoogleConsent(true, true);

    const dataLayer = (globals.window as { dataLayer: unknown[] }).dataLayer;
    expect(dataLayer).toHaveLength(1);
    expect(Object.prototype.toString.call(dataLayer[0])).toBe(
      "[object Arguments]"
    );
    expect(Array.isArray(dataLayer[0])).toBe(false);
  });

  it("명령 이름과 인자를 순서대로 싣는다", () => {
    globals.window = {};

    setGoogleConsent(true, false);

    const dataLayer = (globals.window as { dataLayer: unknown[] }).dataLayer;
    const command = Array.from(dataLayer[0] as IArguments);
    expect(command[0]).toBe("consent");
    expect(command[1]).toBe("update");
    expect(command[2]).toMatchObject({
      analytics_storage: "granted",
      ad_storage: "denied",
    });
  });
});
