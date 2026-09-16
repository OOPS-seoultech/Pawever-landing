import { test, expect, type Page } from "@playwright/test";

/**
 * 우체국 접수 내역 붙여넣기.
 *
 * 우체국 내역에는 주문번호가 없고 이름 한 덩어리뿐이다. 답이 하나로 확실하면
 * 자동으로 넘기고, 갈리면 사람이 고른다. 잘못 맞추면 다른 고객에게 다른
 * 피규어가 간다.
 */
async function session(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/admin/me", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 1,
          name: "대표",
          role: "OWNER",
          workRoles: [],
          permissions: [
            "PACK_AND_EXPORT_SHIPMENTS",
            "IMPORT_SHIPMENT_RESULTS",
            "VIEW_ALL_ORDERS",
            "VIEW_ORDER_BASIC",
          ],
        },
      },
    })
  );
  await page.route("**/api/admin/shipments/**", route => {
    const url = route.request().url();
    if (url.includes("/export-batches")) {
      route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 7,
              orderCount: 2,
              exportedAt: "2026-09-16T01:00:00Z",
              downloadable: true,
              orderNumbers: ["PE-1", "PE-2"],
            },
          ],
        },
      });
      return;
    }
    route.fulfill({ json: { success: true, data: [] } });
  });
}

const candidates = [
  {
    orderNumber: "PE-1",
    guardianName: "황성욱",
    petName: "보리",
    postalCode: "01811",
  },
  {
    orderNumber: "PE-2",
    guardianName: "황성욱",
    petName: "코코",
    postalCode: "01811",
  },
];

const autoRow = {
  id: 11,
  version: 0,
  lineNumber: 1,
  rawLine: "…",
  trackingNumber: "1234567890123",
  postageKrw: 1800,
  postalCode: "01811",
  recipientLabel: "황성욱 보리",
  status: "AUTO_MATCH",
  matchKind: "AUTO",
  reason: "이름과 우편번호가 맞는 주문이 하나입니다.",
  candidates: ["PE-1"],
  matchedOrderNumber: "PE-1",
  selectable: true,
};

const ambiguousRow = {
  id: 12,
  version: 0,
  lineNumber: 3,
  rawLine: "…",
  trackingNumber: "9876543210987",
  postageKrw: 1800,
  postalCode: "01811",
  recipientLabel: "황성욱",
  status: "NEEDS_REVIEW",
  matchKind: "MODAL",
  reason: "같은 이름이 여러 주문과 맞습니다.",
  candidates: ["PE-1", "PE-2"],
  matchedOrderNumber: null,
  selectable: false,
};

test("동명이인은 사람이 고르고, 고른 것만 반영한다", async ({ page }) => {
  await session(page);

  await page.route("**/api/admin/postal-imports/preview", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          batchId: 99,
          outboundBatchId: 7,
          rows: [autoRow, ambiguousRow],
          candidates,
        },
      },
    })
  );

  let resolved: Record<string, unknown> | null = null;
  await page.route("**/api/admin/postal-imports/99/rows/12/resolve", route => {
    resolved = route.request().postDataJSON();
    route.fulfill({
      json: {
        success: true,
        data: {
          batchId: 99,
          outboundBatchId: 7,
          rows: [
            autoRow,
            {
              ...ambiguousRow,
              version: 1,
              status: "CONFIRMED_MANUAL",
              matchedOrderNumber: "PE-2",
              selectable: true,
            },
          ],
          candidates,
        },
      },
    });
  });

  let committed: Record<string, unknown> | null = null;
  await page.route("**/api/admin/postal-imports/99/commit", route => {
    committed = route.request().postDataJSON();
    route.fulfill({
      json: {
        success: true,
        data: {
          results: { "11": "APPLIED", "12": "APPLIED" },
          rows: [
            { ...autoRow, status: "COMMITTED", selectable: false },
            {
              ...ambiguousRow,
              status: "COMMITTED",
              matchedOrderNumber: "PE-2",
              selectable: false,
            },
          ],
        },
      },
    });
  });

  await page.goto("/admin/shipments");
  await page.getByRole("combobox").selectOption("7");

  await page
    .getByLabel("우체국 접수 내역")
    .fill("1234567890123\t1,800\t01811\t황성욱 보리\n통상 반송불요 20g");
  await page.getByRole("button", { name: "읽어보기" }).click();

  // 자동으로 맞은 줄만 미리 골라 둔다. 확인이 필요한 줄까지 골라 두면 사람이
  // 보지 않은 것을 누르게 된다.
  await expect(page.getByLabel("1번째 줄 선택")).toBeChecked();
  await expect(page.getByLabel("3번째 줄 선택")).not.toBeChecked();
  await expect(page.getByLabel("3번째 줄 선택")).toBeDisabled();
  await expect(page.getByText("같은 이름이 여러 주문과 맞습니다.")).toBeVisible();

  await page.getByRole("button", { name: "고르기" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("어느 주문인지");
  await page.getByRole("button", { name: /PE-2/ }).click();

  expect(resolved).toMatchObject({ orderNumber: "PE-2", expectedVersion: 0 });
  await expect(page.getByLabel("3번째 줄 선택")).toBeChecked();

  await page.getByRole("button", { name: /선택 건 송장 반영/ }).click();

  expect(committed).toMatchObject({ selectedRowIds: [11, 12] });
  await expect(page.getByText("반영했습니다").first()).toBeVisible();
});

test("붙여넣기만으로는 아무것도 바뀌지 않는다", async ({ page }) => {
  await session(page);

  let commitCalls = 0;
  await page.route("**/api/admin/postal-imports/preview", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          batchId: 99,
          outboundBatchId: 7,
          rows: [autoRow],
          candidates,
        },
      },
    })
  );
  await page.route("**/api/admin/postal-imports/*/commit", route => {
    commitCalls += 1;
    route.fulfill({ json: { success: true, data: { results: {}, rows: [] } } });
  });

  await page.goto("/admin/shipments");
  await page.getByRole("combobox").selectOption("7");
  await page
    .getByLabel("우체국 접수 내역")
    .fill("1234567890123\t1,800\t01811\t황성욱 보리\n통상 반송불요 20g");
  await page.getByRole("button", { name: "읽어보기" }).click();

  await expect(page.getByLabel("1번째 줄 선택")).toBeChecked();
  // 읽어보기만으로 송장이 붙으면, 확인하려던 사람이 실수로 발송을 만든다.
  expect(commitCalls).toBe(0);
});
