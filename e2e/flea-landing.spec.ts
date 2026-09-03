import { expect, test } from "@playwright/test";
import { mockCampaign, mockFleaCampaign, photoFile } from "./fixtures/api";

/**
 * 과기대 대동제 플리마켓 전용 랜딩(/flea).
 *
 * 현장에 QR 을 두고 그 자리에서 주문을 받는 화면이다. 상시 랜딩(/goods-survey)
 * 과 값도 정원도 다르고, 그 둘이 동시에 열려 있는 동안 섞이면 안 된다.
 *
 * 근거: [피그마 0uW99BqaTJKUVlowzQswli / 8-2. Rending Page, 5472:1444]
 * 근거: [카톡 나혜님] "CTA 버튼들 클릭 시 바로 사진 및 정보 등록하는 페이지로
 *       엔드포인트 설정해주세요!"
 * 근거: [카톡 8/28 대표] "다다음주 과기대 플리마켓이 진행됩니다. 이때 QR배치해서
 *       주문 제작 받고, 바로 제작 후 판매해볼까 합니다."
 */

/** 디자인이 화면에 적어 둔 값. 서버가 계산하는 값과 같아야 한다. */
const FLEA_PRICE = "11,900원";
const LIST_PRICE = "29,900원";

test.describe("플리마켓 랜딩", () => {
  test.beforeEach(async ({ page }) => {
    await mockFleaCampaign(page);
    // 정가 버튼은 상시 판매로 간다. 그쪽 모집도 함께 물려 둔다.
    await mockCampaign(page);
  });

  test("현장 한정가와 수량을 디자인대로 적는다", async ({ page }) => {
    // 근거: [5472:1478] "서울과학기술대학교 플리마켓 전용가"
    //       [5472:1480] "11,900원"  [5498:2395] "60.2% 할인"
    //       [5472:1662] "이번에도 선착순 70개만 제작합니다."
    //
    // 값이 화면과 서버에서 갈리면 사람은 동의하지 않은 금액을 청구받는다.
    await page.goto("/flea");

    await expect(page.locator(".flea-price-card")).toContainText(
      "서울과학기술대학교 플리마켓 전용가"
    );
    await expect(page.locator(".flea-price-card")).toContainText(FLEA_PRICE);
    await expect(page.locator(".flea-price-card")).toContainText("60.2%");
    // 정가는 취소선으로만 나온다.
    await expect(page.locator(".flea-was")).toHaveText(
      `기존 판매가 ${LIST_PRICE}`
    );

    await expect(page.locator(".gs-limit-card")).toContainText("2차 준비 수량");
    await expect(page.locator(".gs-limit-card")).toContainText("70개");
  });

  test("디자인이 적어 둔 치수대로 그린다", async ({ page }) => {
    // 눈으로 대조하면 놓친다. 취소선 글꼴은 font-family 목록에 inherit 을
    // 넣는 바람에 선언 전체가 버려져 한 번도 바뀌지 않았는데, 화면만 봐서는
    // Pretendard ExtraBold 와 구분되지 않았다.
    //
    // 근거: [피그마 5472:1465] 좌우 여백 25, [5472:1473] 사진 모서리 22,
    //       [5472:1486] Cafe24 Ohsquare 32px, [5472:1485] 상자 높이 75
    await page.goto("/flea");

    const measured = await page.evaluate(() => {
      const box = (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement;
        const cs = getComputedStyle(el);
        return {
          padX: cs.paddingLeft,
          radius: cs.borderRadius,
          family: cs.fontFamily,
          size: cs.fontSize,
          height: Math.round(el.getBoundingClientRect().height),
        };
      };
      return {
        section: box(".flea-hero"),
        figure: box(".flea-hero img.gs-figure"),
        was: box(".flea-was"),
      };
    });

    expect(measured.section.padX).toBe("25px");
    expect(measured.figure.radius).toBe("22px");
    // 목록에 못 쓰는 값이 섞이면 선언째로 버려진다. 이름이 남아 있는지 본다.
    expect(measured.was.family).toContain("Cafe24 Ohsquare");
    expect(measured.was.size).toBe("32px");
    // 상자는 75px 로 서 있어야 한다. 다만 한 픽셀은 봐준다 — 글꼴 메트릭
    // 반올림이 운영체제마다 달라, 리눅스에서 76 이 나와 CI 만 깨진 적이 있다.
    // 한 픽셀을 잡겠다고 CI 를 흔들면 진짜 어긋남을 볼 눈이 무뎌진다.
    expect(measured.was.height).toBeGreaterThanOrEqual(75);
    expect(measured.was.height).toBeLessThanOrEqual(77);
  });

  test("글자 굵기와 크기를 디자인이 적어 둔 대로 쓴다", async ({ page }) => {
    // 36px 짜리 제목이 굵기 400 으로 나가고 있었는데 화면만 봐서는 "조금
    // 얇네" 정도로 지나쳤다. 상시 랜딩은 자기 클래스에 굵기를 걸어 두었고,
    // 이 화면은 클래스 이름이 달라 그 규칙에 걸리지 않는다.
    //
    // 굵기는 눈대중이 가장 안 통하는 값이다. 디자인이 적어 둔 수를 그대로
    // 옮겨 두고 재서 확인한다.
    const WANT: [string, string, number, number][] = [
      [".gs-topbar > span", "헤더 뱃지", 800, 11],
      [".flea-hero h1", "01 제목", 800, 36],
      [".flea-hero .gs-lead", "01 부제", 600, 16],
      [".flea-hero .gs-primary-cta", "01 버튼", 800, 20],
      [".flea-price-card > strong", "현장가", 800, 36],
      [".flea-why-now h2", "02 제목", 800, 30],
      [".gs-voice p", "후기 본문", 600, 16],
      [".flea-wait-card > span", "잠깐!", 900, 17],
      [".flea-wait-card > h3", "왜 가격이", 800, 28],
      [".flea-buy-card > strong", "카드 금액", 700, 36],
      [".gs-limit-card strong", "2차 준비 수량", 700, 20],
      [".gs-closed-card strong", "1차 모집 완료", 700, 20],
      [".gs-step h3", "단계 제목", 800, 20],
      [".gs-faq-list summary", "자주 묻는 질문", 700, 14],
    ];

    await page.goto("/flea");
    // 구매 버튼은 모집 상태를 받은 뒤에 그려진다. 그 전에 재면 없는 것으로
    // 나온다.
    await expect(page.locator('[data-cta-id="btn_F1"]')).toBeVisible();

    const wrong = await page.evaluate(want => {
      const bad: string[] = [];
      for (const [sel, label, weight, size] of want) {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) {
          bad.push(`${label}: 찾지 못함`);
          continue;
        }
        const cs = getComputedStyle(el);
        const gotWeight = parseInt(cs.fontWeight, 10);
        const gotSize = parseFloat(cs.fontSize);
        if (gotWeight !== weight || Math.abs(gotSize - size) > 0.5) {
          bad.push(
            `${label}: 기대 ${weight}/${size}px, 실제 ${gotWeight}/${gotSize}px`
          );
        }
      }
      return bad;
    }, WANT);

    expect(wrong, `디자인과 다른 곳 — ${wrong.join(" / ")}`).toEqual([]);
  });

  test("구매 버튼 넷이 모두 등록 화면으로 간다", async ({ page }) => {
    // 근거: [카톡 나혜님] "CTA 버튼들 클릭 시 바로 사진 및 정보 등록하는
    //       페이지로 엔드포인트 설정해주세요!"
    //
    // 설문을 거치지 않는다. 현장에서 QR 을 찍은 사람에게 10~15분짜리 설문을
    // 세우면 줄이 멈춘다.
    await page.goto("/flea");

    for (const ctaId of ["btn_F1", "btn_F2", "btn_F3"]) {
      await page.goto("/flea");
      await page.locator(`[data-cta-id="${ctaId}"]`).click();
      await expect(page).toHaveURL(
        /\/goods-survey\/survey\?direct=1&channel=flea$/
      );
    }
  });

  test("정가 버튼만 상시 판매로 간다", async ({ page }) => {
    // 근거: [5472:1767] "온라인 배송비 별도, 과기대 외 다른 지인에게 소개용"
    //
    // 현장 밖 사람에게 11,900원을 주면 안 된다. 이 버튼에는 channel 이 붙지
    // 않아야 하고, 그러면 서버가 상시 모집으로 받아 정가를 매긴다.
    await page.goto("/flea");
    await page.locator('[data-cta-id="btn_F4"]').click();

    await expect(page).toHaveURL(/\/goods-survey\/survey\?direct=1$/);
  });

  test("사진 등록 카드는 세 장을 다 채워야 열린다", async ({ page }) => {
    // 근거: [5492:2347] 카드의 세는 칸이 "0/3", 버튼이 "사진 3장 등록하기"
    // 디자인은 이 카드를 03 과 09 두 곳에 둔다.
    await page.goto("/flea");

    const cards = page.locator(".gs-intake");
    await expect(cards).toHaveCount(2);

    const first = cards.first();
    await expect(first.locator(".gs-intake-count")).toHaveText("0/3");
    await expect(first.locator(".gs-intake-submit")).toBeDisabled();

    for (const label of [
      "정면 또는 옆모습 사진 추가하기",
      "몸 전체가 보이게 사진 추가하기",
      "특징이 잘 보이게 사진 추가하기",
    ]) {
      await first.getByLabel(label).setInputFiles(photoFile(`${label}.jpg`));
    }

    await expect(first.locator(".gs-intake-count")).toHaveText("3/3");
    await expect(first.locator(".gs-intake-submit")).toBeEnabled();
  });

  test("모집이 닫히면 살 수 있는 자리가 하나도 남지 않는다", async ({
    page,
  }) => {
    // 행사가 끝나면 서버에서 이 경로를 닫는다. 화면은 그대로 두지만 값이
    // 그대로 보이면서 버튼만 살아 있으면, 못 줄 것을 판다고 적는 셈이다.
    await mockFleaCampaign(page, { goodsOpen: false });
    await page.goto("/flea");

    await expect(page.locator("[data-cta-id]")).toHaveCount(0);
    await expect(
      page.getByText("지금은 신청을 받지 않아요").first()
    ).toBeVisible();
  });

  test("검색에 걸리지 않는다", async ({ page }) => {
    // 현장 QR 로만 여는 화면이다. 검색으로 들어온 사람이 한정가를 보고
    // 주문하면 현장에서 받아갈 수 없다.
    await page.goto("/flea");

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow"
    );
  });

  test("상시 랜딩은 그대로다", async ({ page }) => {
    // 플리마켓 화면을 새로 만들면서 기존 랜딩을 건드리지 않았다는 확인이다.
    // 같은 자리에서 두 값이 보이면 어느 쪽이 참인지 알 수 없다.
    await page.goto("/goods-survey");

    await expect(page.locator(".gs-topbar span")).toHaveText(
      "2차 참여자 모집중"
    );
    await expect(page.locator("body")).not.toContainText(FLEA_PRICE);
  });
});
