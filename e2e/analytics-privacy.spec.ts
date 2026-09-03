import { expect, test } from "@playwright/test";
import { mockCampaign, mockDraft, photoFile } from "./fixtures/api";

/**
 * 분석 도구로 개인정보가 새지 않는지 본다.
 *
 * 근거: [카톡 8/19 08:54 단톡, 대표] 개발 요청 —
 *       "GTM/GA4/Meta Pixel에 개인정보가 전달되지 않는지 검증"
 * 근거: 개인정보처리방침에 "GA4는 GTM을 통해 웹 방문 이벤트 분석에만 사용"
 *       이라고 적어 두었다. 적어 둔 것을 지키는지 확인하는 장치가 없었다.
 *
 * 이미 sanitizeAnalyticsProperties 가 키 이름으로 걸러 낸다(phone, address,
 * guardian_name 등). 단위 테스트도 있다. 그런데 그 방어는 이름만 본다 —
 *
 *   guardian_name: "황성욱"              → 막힌다 (이름이 걸림)
 *   custom_goods:  "황성욱 010-1234..."  → 지나간다 (이름이 안 걸림)
 *
 * 그래서 여기서는 값으로 본다. 실제 흐름에 눈에 띄는 값을 넣고, 나가려던
 * 이벤트 어디에도 그 값이 없는지 확인한다.
 *
 * 태그를 실제로 받아오지는 않는다. VITE_ANALYTICS_DEBUG 를 켜면 보내려던
 * 이벤트가 window.__PAWEVER_ANALYTICS__ 에 그대로 쌓이고, 그것이 GA4·GTM 에
 * 실릴 값과 같다. 구글에 붙지 않으므로 네트워크에 묶이지도 않는다.
 */

/** 화면에 넣을 값. 우연히 다른 곳에 나올 수 없게 눈에 띄는 것으로 고른다. */
const PII = {
  guardianName: "개인정보검증용보호자",
  petName: "개인정보검증용반려견",
  phone: "010-9876-5432",
  postalCode: "01811",
  address: "서울 노원구 개인정보검증용로 232",
  addressDetail: "101동 909호",
};

/** 우편번호는 다섯 자리 숫자라 다른 값과 겹칠 수 있어 따로 본다. */
const LEAKY_VALUES = [
  PII.guardianName,
  PII.petName,
  PII.phone,
  PII.phone.replace(/-/g, ""),
  PII.address,
  PII.addressDetail,
];

const SLOTS = [
  "정면 또는 옆모습 사진 추가하기",
  "몸 전체가 보이게 사진 추가하기",
  "특징이 잘 보이게 사진 추가하기",
];

/** 화면이 지금까지 보내려던 이벤트 전부. */
const recordedEvents = (page: import("@playwright/test").Page) =>
  page.evaluate(() => window.__PAWEVER_ANALYTICS__ ?? []);

test.describe("분석 도구로 개인정보가 새지 않는다", () => {
  test.beforeEach(async ({ page }) => {
    await mockCampaign(page, { goodsOpen: true });
    await mockDraft(page);
  });

  test("신청서에 적은 값이 이벤트 어디에도 실리지 않는다", async ({ page }) => {
    // 랜딩에서 사진까지 올려 실제 흐름을 그대로 탄다. 여기서만 나가는
    // 이벤트가 있어서, 주문 화면으로 바로 가면 그것들을 지나친다.
    await page.goto("/goods-survey");
    for (const label of SLOTS) {
      await page.getByLabel(label).setInputFiles(photoFile(`${label}.jpg`));
    }
    await page.locator('[data-cta-id="btn_A5"]').click();
    await expect(page).toHaveURL(/\?direct=1$/);

    await page.getByPlaceholder("반려견 이름").fill(PII.petName);
    await page.getByPlaceholder("받는 분 이름").fill(PII.guardianName);
    await page.getByPlaceholder("010-0000-0000").fill(PII.phone);
    await page.getByPlaceholder("우편번호").fill(PII.postalCode);
    await page.getByPlaceholder("도로명 주소").fill(PII.address);
    await page.getByPlaceholder("동·호수 등 상세 주소").fill(PII.addressDetail);

    // 입력 도중에도 이벤트가 나간다(질문 조회·이탈 등). 자리를 옮겨
    // 그것들까지 쌓이게 한다.
    await page.getByPlaceholder("반려견 이름").click();
    await page.waitForTimeout(500);

    const events = await recordedEvents(page);
    expect(
      events.length,
      "이벤트가 하나도 안 쌓였다면 이 검사는 아무것도 못 본다"
    ).toBeGreaterThan(0);

    const dump = JSON.stringify(events);
    for (const value of LEAKY_VALUES) {
      expect(dump, `이벤트에 "${value}" 가 실렸다`).not.toContain(value);
    }
  });

  test("주소창에도 개인정보가 남지 않는다", async ({ page }) => {
    // page_location 은 전체 URL 을 그대로 실어 보낸다. 값이 한 번이라도
    // 쿼리스트링에 실리면 그대로 구글로 간다.
    await page.goto("/goods-survey/survey?direct=1");
    await page.getByPlaceholder("받는 분 이름").fill(PII.guardianName);
    await page.getByPlaceholder("010-0000-0000").fill(PII.phone);
    await page.waitForTimeout(300);

    expect(page.url()).not.toContain(PII.guardianName);
    expect(page.url()).not.toContain(PII.phone);

    const locations = (await recordedEvents(page)).flatMap(event => [
      String(event.properties?.page_location ?? ""),
      String(event.path ?? ""),
    ]);
    for (const value of LEAKY_VALUES) {
      expect(locations.join(" ")).not.toContain(value);
    }
  });

  test("금지된 이름의 칸은 아예 실리지 않는다", async ({ page }) => {
    // 키 이름으로 거르는 방어가 실제 화면에서도 살아 있는지 본다.
    // 단위 테스트는 함수만 보는데, 여기서는 실제로 쌓인 이벤트를 본다.
    await page.goto("/goods-survey/survey?direct=1");
    await page.waitForTimeout(500);

    const keys = new Set(
      (await recordedEvents(page)).flatMap(event =>
        Object.keys(event.properties ?? {})
      )
    );
    const forbidden =
      /email|phone|address|file_name|filename|photo_url|photo_name|pet_name|guardian_name|^(answer|answer_value|response|response_text|photo|file)$/i;

    expect([...keys].filter(key => forbidden.test(key))).toEqual([]);
  });

  test("동의 없이 외부 태그를 부르지 않는다", async ({ page }) => {
    // 지금은 분석이 꺼진 채로 빌드된다. 그래도 구글·메타로 나가는 요청이
    // 하나라도 생기면 여기서 잡힌다 — 누군가 태그를 코드에 직접 박아 넣는
    // 경우가 그렇다.
    const external: string[] = [];
    page.on("request", request => {
      const host = new URL(request.url()).hostname;
      if (
        /google-analytics|googletagmanager|facebook|doubleclick/i.test(host)
      ) {
        external.push(host);
      }
    });

    await page.goto("/goods-survey");
    await page.waitForTimeout(1000);

    expect([...new Set(external)]).toEqual([]);
  });
});
