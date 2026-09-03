import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { mockCampaign, mockDraft, photoFile } from "./fixtures/api";

/**
 * 주문 화면(/goods-survey/survey)에서 결제 직전까지.
 *
 * 결제 단계는 일부러 비워 둔다. 8/31 현재 승인된 결제 수단이 없다 —
 *
 *   [개인톡 8/20 09:20] "계좌이체로 진행하지 말고 바로 토스PG 연동하려고
 *     합니다" · "모달에서 「문자로 계좌번호 안내」가 아니라, 바로 토스
 *     페이먼츠로 결제되도록"
 *   [개인톡 8/23 19:51] "토스 페이먼츠 비용이 많이 발생해서 PG사 조금 더
 *     찾아보고 있습니다"
 *   [개인톡 8/23 20:40] 포트원 + KG이니시스로 전환, 심사 신청
 *   [단톡 8/26 10:53] "통신판매업 발급이 필요해서 오늘 신청해두려고 합니다!
 *     PG사 연동은 우선 제외하고 2번 이후 단계 진행해주시면 돼요!"
 *
 * 8/26 이 가장 최신이고, 그것은 "계좌이체로 되돌려라"가 아니라 "PG 붙이는
 * 일을 뒤로 미뤄라"다. 계좌이체는 8/20 에 막혔고 PG 는 8/26 에 보류됐으므로
 * 지금 이 화면 뒤에 올 것이 정해져 있지 않다. 정해지기 전에 아무 동작이나
 * 여기에 못 박으면 테스트가 틀린 화면을 지키게 된다.
 */

const DIRECT = "/goods-survey/survey?direct=1";

const SLOTS = [
  "정면 또는 옆모습 사진 추가하기",
  "몸 전체가 보이게 사진 추가하기",
  "특징이 잘 보이게 사진 추가하기",
];

/** 제작·배송 정보를 다 채운다. 자리표시자로 잡는 게 라벨보다 흔들리지 않는다. */
const fillShipping = async (page: import("@playwright/test").Page) => {
  await page.getByPlaceholder("반려견 이름").fill("보리");
  await page.getByPlaceholder("받는 분 이름").fill("황성욱");
  await page.getByPlaceholder("010-0000-0000").fill("010-1234-5678");
  await page.getByPlaceholder("우편번호").fill("01811");
  await page.getByPlaceholder("도로명 주소").fill("서울 노원구 공릉로 232");
};

const consent = (page: import("@playwright/test").Page, text: string) =>
  page.locator(`label:has-text("${text}") input[type="checkbox"]`);

test.describe("설문을 건너뛴 주문", () => {
  test.beforeEach(async ({ page }) => {
    await mockCampaign(page, { goodsOpen: true });
    await mockDraft(page);
  });

  test("정가로 동의를 받는다", async ({ page }) => {
    // 근거: [카톡 8/24 14:03] "설문 미진행 = 그냥 굿즈 구매 / 설문 진행 =
    //       할인 받고 굿즈 구매 소구점 각각 재설정"
    // 제작비 29,900 + 배송비 3,000 = 32,900. 설문을 마치면 23,900 이다.
    // 동의한 금액과 청구될 금액이 어긋나면 그 동의는 받은 적이 없는 것이 된다.
    await page.goto(DIRECT);

    const label = page.locator('label:has-text("결제하는 데 동의합니다")');
    await expect(label).toContainText("제작비 29,900원");
    await expect(label).toContainText("배송비 3,000원");
    await expect(label).toContainText("32,900원");
  });

  test("들어오자마자 초안을 만들고 직행이라고 서버에 알린다", async ({
    page,
  }) => {
    // 값이 갈리는 판정은 서버가 한다. 화면이 혼자 정가를 그려 놓고 서버에
    // 알리지 않으면, 서버는 이 사람을 설문 참여자로 보고 23,900원을 매긴다.
    const calls: string[] = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname.includes("/goods-survey/responses"))
        calls.push(
          `${request.method()} ${url.pathname.replace(/\/[^/]*e2e-response-0001/, "/{id}")}`
        );
    });

    await page.goto(DIRECT);
    await expect(page.getByText("마지막 단계")).toBeVisible();

    expect(calls).toContain("POST /api/public/goods-survey/responses");
    expect(
      calls.some(c => c.endsWith("/direct-purchase")),
      "직행이라는 사실을 서버에 알려야 한다"
    ).toBe(true);
  });

  test("기다리는 동안 설문 안내를 보여 주지 않는다", async ({ page }) => {
    // 랜딩에서 "바로 예약 주문 걸기"를 누른 사람에게 "돌봄 경험 조사 ·
    // 10~15분"이 잠깐 떴다. 서버가 자리를 잡아 주는 사이 설문 안내가 그대로
    // 있었기 때문이다.
    //
    // 현장에서 QR 을 찍고 줄을 선 사람에게 그 한 화면은 곧 이탈이다. 이
    // 랜딩이 없애려던 단계가 다른 얼굴로 돌아온 셈이었다.
    await mockDraft(page, { delayMs: 1500 });
    await page.goto(DIRECT);

    await expect(page.locator(".gsf-preparing")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("돌봄 경험 조사");
    await expect(page.locator("body")).not.toContainText("10~15분");
    // 설문을 거치지 않는 사람에게 설문 소요 시간을 적을 이유가 없다.
    await expect(page.locator(".gsf-header-time")).toHaveCount(0);

    // 끝나면 제작 정보로 간다.
    await expect(page.getByText("마지막 단계")).toBeVisible();
    await expect(page.locator(".gsf-preparing")).toHaveCount(0);
  });

  test("설문으로 들어오면 안내는 그대로다", async ({ page }) => {
    // 직행만 건너뛴다. 설문에 답하러 온 사람은 무엇을 받는지 알고 시작해야
    // 한다.
    await page.goto("/goods-survey/survey");

    await expect(page.locator(".gsf-intro")).toBeVisible();
    await expect(page.locator(".gsf-header-time")).toHaveText("약 15분");
  });

  test("사진이 없으면 다 채워도 신청이 잠긴 채로 있다", async ({ page }) => {
    // 사진은 제작의 재료다. 없이 접수되면 만들 수 없는 주문이 결제까지 간다.
    await page.goto(DIRECT);
    await fillShipping(page);
    await consent(page, "개인정보 수집·이용에 동의합니다").check();
    await consent(page, "결제하는 데 동의합니다").check();

    await expect(
      page.getByRole("button", { name: /신청 완료하기/ })
    ).toBeDisabled();
  });

  test("사진이 한 장뿐이면 신청이 잠긴 채로 있다", async ({ page }) => {
    // 근거: [카톡 나혜님] "랜딩페이지에서 사진 1개 등록해도 제출 버튼이
    //       활성화되잖아요. 사진 3개 이상 등록해야 제출 버튼 활성화되도록
    //       변경해주세요. 즉, 사진 3개 이상만 제출 가능하도록 (3-5개)"
    // 근거: [피그마 0uW99BqaTJKUVlowzQswli / 8-2 Rending Page]
    //       06 PROCESS 5472:1607 "사진 3장", FAQ 5472:1830 "얼굴, 전신,
    //       털색과 무늬가 잘 보이는 사진 3장을 준비해 주세요",
    //       사진 등록 카드 5492:2347 의 세는 칸이 "0/3".
    //
    // 랜딩의 등록 카드는 이미 세 칸을 다 채워야 열린다. 잠기지 않은 것은
    // 주문 화면이다. 한 장으로 접수되면 만들 수 없는 주문이 결제까지 간다.
    await page.goto(DIRECT);
    await fillShipping(page);
    await consent(page, "개인정보 수집·이용에 동의합니다").check();
    await consent(page, "결제하는 데 동의합니다").check();

    const submit = page.getByRole("button", { name: /신청 완료하기/ });
    const upload = page.locator('.gsf-upload input[type="file"]');

    // 한 장씩 더해 간다. 고른 것은 뒤에 쌓이므로 같은 목록을 다시 보내지
    // 않는다 — 그렇게 쓰면 어느 장이 몇 번째로 들어갔는지가 시험마다 달라진다.
    await upload.setInputFiles(photoFile("1.jpg"));
    await expect(page.locator(".gsf-file-name")).toHaveCount(1);
    await expect(submit).toBeDisabled();

    // 두 장도 아직이다. 얼굴·전신·털무늬 세 종이 제작의 최소 구성이다.
    await upload.setInputFiles(photoFile("2.jpg"));
    await expect(page.locator(".gsf-file-name")).toHaveCount(2);
    await expect(submit).toBeDisabled();

    await upload.setInputFiles(photoFile("3.jpg"));
    await expect(page.locator(".gsf-file-name")).toHaveCount(3);
    await expect(submit).toBeEnabled();
  });

  test("사진을 나눠 골라도 앞서 고른 것이 남는다", async ({ page }) => {
    // 갤러리 앱에 따라 한 번에 여러 장을 고르기 어렵다. 한 장씩 고르면
    // 앞서 고른 것이 사라져, 세 장을 채우려면 반드시 한 번에 성공해야 했다.
    await page.goto(DIRECT);
    const upload = page.locator('.gsf-upload input[type="file"]');
    const names = page.locator(".gsf-file-name");

    await upload.setInputFiles(photoFile("A.jpg"));
    await expect(names).toHaveCount(1);

    await upload.setInputFiles(photoFile("B.jpg"));
    await expect(names).toHaveCount(2);
    await expect(names).toContainText(["A.jpg", "B.jpg"]);

    await upload.setInputFiles(photoFile("C.jpg"));
    await expect(names).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: /신청 완료하기/ })
    ).toBeDisabled();
  });

  test("같은 사진을 두 번 골라도 한 장으로 센다", async ({ page }) => {
    // 두 번 고른 것을 두 장으로 세면 다섯 칸이 같은 사진으로 찬다.
    //
    // 같은 파일인지는 이름·크기·수정시각으로 본다. 그래서 여기서는 버퍼가
    // 아니라 디스크의 실제 파일을 고른다 — 버퍼로 만든 파일은 고를 때마다
    // 수정시각이 지금으로 잡혀, 같은 사진을 다시 골라도 다른 것이 된다.
    const samePhoto = fileURLToPath(
      new URL("../client/public/goods-survey/flea-plus.webp", import.meta.url)
    );
    await page.goto(DIRECT);
    const upload = page.locator('.gsf-upload input[type="file"]');

    await upload.setInputFiles(samePhoto);
    await expect(page.locator(".gsf-file-name")).toHaveCount(1);

    await upload.setInputFiles(samePhoto);
    await expect(page.locator(".gsf-file-name")).toHaveCount(1);
  });

  test("다섯 장을 넘기면 담지 않은 장수를 말해 준다", async ({ page }) => {
    // 조용히 버리면 사람은 올린 줄 안다. 제작에 쓸 사진이 빠진 채로 접수된다.
    await page.goto(DIRECT);
    const upload = page.locator('.gsf-upload input[type="file"]');
    const names = page.locator(".gsf-file-name");

    await upload.setInputFiles(
      ["1", "2", "3", "4", "5"].map(n => photoFile(`${n}.jpg`))
    );
    await expect(names).toHaveCount(5);

    await upload.setInputFiles(photoFile("6.jpg"));

    await expect(names).toHaveCount(5);
    await expect(page.locator(".gsf-api-error")).toContainText(
      "1장은 담지 않았어요"
    );
  });

  test("형식이 틀린 사진을 골라도 앞서 고른 것은 남는다", async ({ page }) => {
    // 실수 한 번에 다시 처음부터 고르게 만들면, 고칠 기회가 아니라 벌이 된다.
    await page.goto(DIRECT);
    const upload = page.locator('.gsf-upload input[type="file"]');

    await upload.setInputFiles(photoFile("A.jpg"));
    await upload.setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("사진이 아니다"),
    });

    await expect(page.locator(".gsf-file-name")).toHaveCount(1);
    await expect(page.locator(".gsf-api-error")).toBeVisible();
  });

  test("랜딩에서 올린 사진 세 장이 주문 화면까지 따라온다", async ({
    page,
  }) => {
    // 근거: [카톡 8/27 14:26] 랜딩에서 바로 사진을 등록하게 해 달라는 요청.
    // 사진이 화면을 넘는 사이 사라지면 사람은 같은 일을 두 번 한다.
    await page.goto("/goods-survey");
    for (const label of SLOTS) {
      await page.getByLabel(label).setInputFiles(photoFile(`${label}.jpg`));
    }
    await page.locator('[data-cta-id="btn_A5"]').click();
    await expect(page).toHaveURL(/\?direct=1$/);

    await expect(page.locator(".gsf-file-name")).toHaveCount(3);

    // 여기서 신청 완료 버튼이 열린다. 누르는 것은 결제 단계라 하지 않는다.
    await fillShipping(page);
    await consent(page, "개인정보 수집·이용에 동의합니다").check();
    await consent(page, "결제하는 데 동의합니다").check();
    await expect(
      page.getByRole("button", { name: /신청 완료하기/ })
    ).toBeEnabled();
  });

  test("연락처는 숫자만 쳐도 하이픈이 붙는다", async ({ page }) => {
    // "형식에 맞춰 작성해주세요"만 띄우면 하이픈을 넣으라는 건지 빼라는
    // 건지 알 수 없다. 사람에게 규칙을 지키게 하는 대신 규칙을 없앤다.
    await page.goto(DIRECT);
    const phone = page.getByPlaceholder("010-0000-0000");

    await phone.fill("01012345678");
    await expect(phone).toHaveValue("010-1234-5678");
    await expect(page.locator(".gsf-field-error")).toHaveCount(0);
  });

  test("자세히 보기가 동의 문구보다 작다", async ({ page }) => {
    // 10.5px 로 적어 두었는데 한 번도 먹지 않았다. 화면 안의 button 이
    // font 를 통째로 상속받는 규칙(.goods-survey-form-page button)에 밀려
    // 16px 로 나가고 있었다.
    await page.goto(DIRECT);
    // 초안이 만들어져야 제작 정보 화면이 뜬다.
    await expect(page.locator(".gsf-inline-link")).toBeVisible();

    const sizes = await page.evaluate(() => {
      const size = (sel: string) =>
        parseFloat(
          getComputedStyle(document.querySelector(sel) as HTMLElement).fontSize
        );
      return {
        link: size(".gsf-inline-link"),
        consent: size(".gsf-consent-card label span"),
      };
    });

    expect(sizes.link).toBeLessThan(sizes.consent);
  });

  test("연락처 형식이 틀리면 이유를 그 자리에서 말한다", async ({ page }) => {
    // 입금 안내든 배송 안내든 이 번호로 간다. 틀린 채로 접수되면 연락이 끊긴다.
    await page.goto(DIRECT);
    await page.getByPlaceholder("010-0000-0000").fill("1234");
    await page.getByPlaceholder("우편번호").click();

    await expect(page.locator(".gsf-field-error")).toBeVisible();
  });
});

/**
 * 결제 수단이 정해지면 여기를 채운다.
 *
 * 지금 화면은 "입금 안내를 문자로 보내드릴게요 / 입력하신 연락처로 입금 계좌를
 * 문자로 보내드립니다"로 끝난다. 두 가지가 어긋나 있다 —
 *
 *   1. 이 문구는 [개인톡 8/20 09:20] 에서 대표님이 지목해 없애라고 한 그것이다.
 *   2. 문자를 보내는 코드가 서버에 없다. Pawever-back origin/main 전체에서
 *      SMS·알림톡 발송 클라이언트가 0건이다(알리고는 8/16 에 선아님이 가입만
 *      해 둔 상태). 8/30 대표님 테스트 신청 PE-2026-000101 이 계좌를 받지
 *      못한 채 30분 뒤 만료됐다.
 *
 * 그래서 "무엇이 맞는 동작인가"를 지금 적을 수 없다. 세 갈래 중 하나가
 * 정해지면 그때 이 테스트를 살린다 — 문자 발송 붙이기 / 토스 키 등록 /
 * 포트원 연동(코드 없음, 새로 만들어야 함).
 */
test.fixme("결제 수단이 정해지면 신청 완료 뒤 결제로 이어진다", () => {});
