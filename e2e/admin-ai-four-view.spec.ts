import { test, expect, type Page } from "./adminFixtures";
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c3ioAAAAASUVORK5CYII=";
function job(status = "REVIEW") {
  return {
    id: "candidate-1",
    orderNumber: "PE-AI-TEST",
    petIndex: 1,
    petName: "나비",
    status,
    promptVersion: "pet-four-view-api-direct-v1",
    feedback: null,
    errorCode: null,
    createdAt: "2026-11-10T00:00:00Z",
    current: true,
    requestedBy: "제작자",
    reviewedBy: null,
    reviewedAt: null,
    telegramStatus: "ACCEPTED",
    canReview: status === "REVIEW",
    canRegenerate: status === "REVIEW",
    canRetrySave: false,
    images: ["정면", "왼쪽", "뒷면", "오른쪽"].map((label, i) => ({
      id: String(i),
      url: pixel,
      label,
      fileName: label + ".png",
      expiresAt: "2030-01-01T00:00:00Z",
    })),
  };
}
async function session(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test")
  );
  await page.route("**/api/admin/me", r =>
    r.fulfill({
      json: {
        success: true,
        data: {
          id: 1,
          name: "제작자",
          role: "PRODUCTION",
          permissions: [
            "VIEW_ORDER_BASIC",
            "VIEW_CUSTOMER_PHOTOS",
            "VIEW_PRODUCTION_FILES",
            "REVIEW_IMAGES",
          ],
          workRoles: ["MODELING"],
        },
      },
    })
  );
  await page.route("**/api/admin/orders/*/photo-links*", r =>
    r.fulfill({
      json: {
        success: true,
        data: {
          photos: [
            {
              photoId: "photo-1",
              slot: 1,
              url: pixel,
              expiresAt: "2030-01-01T00:00:00Z",
            },
          ],
        },
      },
    })
  );
}
test("모바일에서 원본과 4면도를 비교하고 같은 후보만 승인한다", async ({
  page,
}) => {
  await session(page);
  let state = job();
  let calls = 0;
  await page.route("**/api/production/image-jobs/**", async r => {
    if (r.request().method() === "POST") {
      expect(r.request().url()).toContain("/candidate-1/approve");
      expect(r.request().headers()["idempotency-key"]).toBeTruthy();
      state = { ...job("APPROVED"), reviewedBy: "제작자" };
      calls++;
    }
    await r.fulfill({ json: { success: true, data: state } });
  });
  await page.goto("/admin/image-review/candidate-1");
  await expect(page.getByText("신청 사진 · 나비")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "문제없음 · 4면도 검수 완료" })
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "문제없음 · 4면도 검수 완료" })
    .click();
  await expect(
    page.getByText("확정된 4장이 주문에 반영됐습니다.", { exact: false })
  ).toBeVisible();
  expect(calls).toBe(1);
});
test("수정 부위와 메모를 새 생성 요청에 보내고 생성 중에는 승인하지 못한다", async ({
  page,
}) => {
  await session(page);
  let feedback: unknown;
  await page.route("**/api/production/image-jobs/**", async r => {
    const path = new URL(r.request().url()).pathname;
    if (r.request().method() === "POST") {
      feedback = r.request().postDataJSON();
      return r.fulfill({
        json: {
          success: true,
          data: {
            ...job("QUEUED"),
            id: "candidate-2",
            images: [],
            canRegenerate: false,
          },
        },
      });
    }
    return r.fulfill({
      json: {
        success: true,
        data: path.endsWith("candidate-2")
          ? {
              ...job("QUEUED"),
              id: "candidate-2",
              images: [],
              canRegenerate: false,
            }
          : job(),
      },
    });
  });
  await page.goto("/admin/image-review/candidate-1");
  await page.getByLabel("수정 방향").selectOption("back");
  await page.getByLabel("수정 부위").selectOption("tail");
  await page
    .getByRole("textbox", { name: "수정할 내용" })
    .fill("꼬리 뿌리를 낮게 붙여 주세요.");
  await page.getByRole("button", { name: "피드백 반영하여 다시 생성" }).click();
  await expect(page).toHaveURL(/candidate-2$/);
  expect(feedback).toEqual({
    direction: "back",
    region: "tail",
    note: "꼬리 뿌리를 낮게 붙여 주세요.",
  });
  await expect(
    page.getByRole("button", { name: "문제없음 · 4면도 검수 완료" })
  ).toBeDisabled();
});
test("텔레그램 계정 연결은 개인용 만료 링크를 발급한다", async ({ page }) => {
  await session(page);
  await page.route("**/api/admin/telegram/link", r =>
    r.fulfill({
      json: {
        success: true,
        data:
          r.request().method() === "POST"
            ? {
                url: "https://t.me/example_bot?start=one-use",
                expiresAt: "2030-01-01",
              }
            : { connected: false },
      },
    })
  );
  await page.goto("/admin/telegram");
  await page.getByRole("button", { name: "연결 링크 만들기" }).click();
  await expect(
    page.getByRole("link", { name: "텔레그램에서 연결하기" })
  ).toHaveAttribute("href", "https://t.me/example_bot?start=one-use");
});

test("소유자는 기존 두 방의 이름을 확인하고 주문 변경 없는 테스트를 각각 보낸다", async ({
  page,
}) => {
  await session(page);
  await page.route("**/api/admin/me", r =>
    r.fulfill({
      json: {
        success: true,
        data: {
          id: 1,
          name: "대표",
          role: "OWNER",
          workRoles: [],
          permissions: ["VIEW_ORDER_BASIC", "MANAGE_OPERATION_SETTINGS"],
        },
      },
    })
  );
  await page.route("**/api/admin/telegram/link", r =>
    r.fulfill({ json: { success: true, data: { connected: false } } })
  );
  await page.route("**/api/admin/image-generation/status*", r =>
    r.fulfill({
      json: {
        success: true,
        data: {
          enabled: true,
          keyConfigured: true,
          model: "test",
          connection: false,
          webhooks: { payment: "CONNECTED", review: "CONNECTED" },
        },
      },
    })
  );
  await page.route("**/api/admin/telegram/test-rooms", r =>
    r.fulfill({
      json: {
        success: true,
        data: [
          { kind: "payment", title: "PAWEVER", type: "group" },
          { kind: "review", title: "PAWEVER 제작 검수", type: "group" },
        ],
      },
    })
  );
  const sent: string[] = [];
  await page.route("**/api/admin/telegram/tests/*", r => {
    expect(r.request().method()).toBe("POST");
    expect(r.request().headers()["idempotency-key"]).toBeTruthy();
    const kind = r.request().url().split("/").at(-1)!;
    sent.push(kind);
    return r.fulfill({
      json: {
        success: true,
        data: {
          kind,
          title: kind === "payment" ? "PAWEVER" : "PAWEVER 제작 검수",
          messageId: 10 + sent.length,
          accepted: true,
        },
      },
    });
  });
  await page.goto("/admin/telegram");
  await expect(
    page.getByText("입금방: PAWEVER", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "입금방 테스트 보내기" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "PAWEVER · 테스트 메시지 발송 접수 완료" })
  ).toBeVisible();
  await page.getByRole("button", { name: "검수방 테스트 보내기" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "PAWEVER 제작 검수 · 테스트 메시지 발송 접수 완료" })
  ).toBeVisible();
  expect(sent).toEqual(["payment", "review"]);
});
