import { test, expect, type Page } from "@playwright/test";

async function session(page: Page, allowed = true) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/admin/me", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 1,
          name: "포장 담당자",
          role: "OWNER",
          workRoles: ["PACKING_SHIPPING"],
          permissions: allowed
            ? [
                "PACK_AND_EXPORT_SHIPMENTS",
                "VIEW_ALL_ORDERS",
                "VIEW_ORDER_BASIC",
              ]
            : ["VIEW_ORDER_BASIC"],
        },
      },
    })
  );
}
const order = {
  orderNumber: "PE-SHIP-1",
  version: 12,
  petName: "초코",
  guardianName: "보호자",
  phone: "01012345678",
  postalCode: "01234",
  address: "서울시 테스트로",
  addressDetail: "101호",
  productionStage: "PACKING",
  shipmentStatus: "NOT_READY",
  blockingIssues: [],
};

test("포장 요청의 응답이 끊기면 같은 요청 식별자로 재시도한다", async ({
  page,
}) => {
  await session(page);
  const keys: string[] = [];
  await page.route("**/api/admin/shipments/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file"))
      return route.fulfill({
        body: "test workbook",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    if (route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      if (keys.length === 1) return route.abort("failed");
      return route.fulfill({
        json: {
          success: true,
          data: {
            id: 9,
            orderCount: 1,
            exportedAt: "2026-09-13T07:00:00Z",
            downloadable: true,
          },
        },
      });
    }
    return route.fulfill({
      json: {
        success: true,
        data: path.endsWith("/candidates") ? [order] : [],
      },
    });
  });
  await page.goto("/admin/shipments");
  await page.getByRole("checkbox", { name: /PE-SHIP-1/ }).check();
  const button = page.getByRole("button", {
    name: "선택 주문 포장 완료 및 우체국 파일 받기",
  });
  await button.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await button.click();
  await expect(page.getByRole("status")).toContainText("배치 9");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("포장 완료 후 파일 받기가 실패해도 완료 배치에서 같은 파일을 다시 받는다", async ({
  page,
}) => {
  await session(page);
  let created = false,
    exports = 0,
    downloads = 0;
  await page.route("**/api/admin/shipments/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) {
      downloads++;
      return downloads === 1
        ? route.fulfill({
            status: 503,
            json: { message: "다운로드 일시 실패" },
          })
        : route.fulfill({
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            body: "test workbook",
          });
    }
    if (route.request().method() === "POST") {
      exports++;
      expect(route.request().postDataJSON()).toEqual({
        orders: [{ orderNumber: "PE-SHIP-1", version: 12 }],
      });
      expect(route.request().headers()["idempotency-key"]).toBeTruthy();
      created = true;
      return route.fulfill({
        json: {
          success: true,
          data: {
            id: 7,
            orderCount: 1,
            exportedAt: "2026-09-13T07:00:00Z",
            downloadable: true,
          },
        },
      });
    }
    return route.fulfill({
      json: {
        success: true,
        data: path.endsWith("/candidates")
          ? created
            ? []
            : [order]
          : created
            ? [
                {
                  id: 7,
                  orderCount: 1,
                  exportedAt: "2026-09-13T07:00:00Z",
                  downloadable: true,
                },
              ]
            : [],
      },
    });
  });
  await page.goto("/admin/shipments");
  await page.getByRole("checkbox", { name: /PE-SHIP-1/ }).check();
  await page
    .getByRole("button", { name: "선택 주문 포장 완료 및 우체국 파일 받기" })
    .click();
  await expect(page.getByRole("alert")).toContainText("다운로드 일시 실패");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "배치 7 파일 다시 받기" }).click();
  expect((await download).suggestedFilename()).toBe("post-office-7.xlsx");
  expect(exports).toBe(1);
  await expect(
    page.getByText("우체국 결과 파일의 실제 샘플 확인 후 제공됩니다.")
  ).toBeVisible();
});

test("주소 오류가 있는 주문은 이유를 표시하고 선택하지 못한다", async ({
  page,
}) => {
  await session(page);
  await page.route("**/api/admin/shipments/**", route =>
    route.fulfill({
      json: {
        success: true,
        data: route.request().url().endsWith("/candidates")
          ? [
              {
                ...order,
                blockingIssues: ["우편번호는 5자리 숫자가 필요합니다."],
              },
            ]
          : [],
      },
    })
  );
  await page.goto("/admin/shipments");
  await expect(
    page.getByText("우편번호는 5자리 숫자가 필요합니다.")
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /PE-SHIP-1/ })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "선택 주문 포장 완료 및 우체국 파일 받기",
    })
  ).toBeDisabled();
});

test("포장 내보내기 권한이 없으면 고객 정보 API를 요청하지 않는다", async ({
  page,
}) => {
  await session(page, false);
  let requested = false;
  await page.route("**/api/admin/shipments/**", route => {
    requested = true;
    return route.fulfill({ status: 403 });
  });
  await page.goto("/admin/shipments");
  await expect(
    page.getByText("포장·준등기 관리 권한이 없습니다.")
  ).toBeVisible();
  expect(requested).toBe(false);
});
