import { expect, test } from "@playwright/test";
import { TINY_JPEG, mockCampaign, mockDraft, photoFile } from "./fixtures/api";

/**
 * 랜딩 맨 아래 09 FINAL 의 사진 등록 카드.
 *
 * 근거: [카톡 8/27 14:26 단톡, 대표] "반려견 사진 등록하는 걸 랜딩페이지에서
 *       바로 할 수 있는 부분 (뎁스 삭제)도 추가하고 싶어서"
 * 근거: [피그마 코멘트 #27] 같은 자리를 가리킨다. 디자인의 09 FINAL 은 구매
 *       버튼이 아니라 사진 등록 카드로 끝난다(Article 인스턴스 5425:1470).
 *
 * 사진 세 장은 서버로 보내지 않고 다음 화면까지만 들고 간다. 랜딩에서 올린
 * 사진이 주문 화면에서 사라지면 사람은 같은 일을 두 번 하게 된다.
 */

const SLOTS = [
  "정면 또는 옆모습 사진 추가하기",
  "몸 전체가 보이게 사진 추가하기",
  "특징이 잘 보이게 사진 추가하기",
];

test.describe("09 FINAL 사진 등록 카드", () => {
  test.beforeEach(async ({ page }) => {
    await mockCampaign(page, { goodsOpen: true });
    await mockDraft(page);
    await page.goto("/goods-survey");
  });

  test("세 장을 다 고르기 전에는 등록 버튼이 잠겨 있다", async ({ page }) => {
    const submit = page.locator('[data-cta-id="btn_A5"]');
    await expect(submit).toBeDisabled();
    await expect(page.locator(".gs-intake-count")).toHaveText("0/3");

    // 두 장만 골라도 아직이다. 부분 제출을 허용하면 제작에 못 쓰는 주문이 들어온다.
    for (const label of SLOTS.slice(0, 2)) {
      await page.getByLabel(label).setInputFiles(photoFile(`${label}.jpg`));
    }
    await expect(page.locator(".gs-intake-count")).toHaveText("2/3");
    await expect(submit).toBeDisabled();
  });

  test("세 장을 채우면 주문 화면으로 넘어간다", async ({ page }) => {
    for (const label of SLOTS) {
      await page.getByLabel(label).setInputFiles(photoFile(`${label}.jpg`));
    }
    await expect(page.locator(".gs-intake-count")).toHaveText("3/3");

    const submit = page.locator('[data-cta-id="btn_A5"]');
    await expect(submit).toBeEnabled();
    await submit.click();

    // 구매 버튼과 같은 곳으로 간다. 사진을 올렸다고 다른 길로 새면 안 된다.
    await expect(page).toHaveURL(/\/goods-survey\/survey\?direct=1$/);
  });

  test("허용하지 않는 형식은 이유를 말하고 되돌린다", async ({ page }) => {
    await page.getByLabel(SLOTS[0]).setInputFiles({
      name: "heic-사진.heic",
      mimeType: "image/heic",
      buffer: TINY_JPEG,
    });

    await expect(page.getByRole("alert")).toContainText(
      "JPG·PNG·WEBP 형식, 장당 10MB 이하"
    );
    // 거절했으면 세지도 않아야 한다.
    await expect(page.locator(".gs-intake-count")).toHaveText("0/3");
  });

  test("10MB 를 넘는 사진은 받지 않는다", async ({ page }) => {
    // 서버에 올리기 전에 화면에서 먼저 막는다. 통신이 느린 곳에서 10MB 를
    // 다 보내고 나서 거절당하면 그 시간이 통째로 버려진다.
    const tooBig = Buffer.concat([TINY_JPEG, Buffer.alloc(10 * 1024 * 1024)]);
    await page
      .getByLabel(SLOTS[0])
      .setInputFiles(photoFile("아주-큰-사진.jpg", tooBig));

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator(".gs-intake-count")).toHaveText("0/3");
  });
});
