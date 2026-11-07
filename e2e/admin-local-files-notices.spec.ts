import { test, expect, type Page } from "./adminFixtures";
const desktop =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
test.use({
  userAgent: desktop,
  isMobile: false,
  hasTouch: false,
  viewport: { width: 1440, height: 1000 },
});
const guide = {
  id: 1,
  version: 0,
  title: "내 PC 작업 폴더 연결 안내",
  body: "## 시작하기\n크롬에서 작업 폴더를 연결해 주세요.\n[도움말](https://example.test/help)",
  guideKey: "local-folder-guide",
  authorName: "PAW-EVER 운영팀",
  createdAt: "2026-11-07T01:00:00Z",
  updatedAt: "2026-11-07T01:00:00Z",
};
async function setup(
  page: Page,
  {
    onboarded = false,
    owner = true,
    loseConfirmResponse = false,
  }: {
    onboarded?: boolean;
    owner?: boolean;
    loseConfirmResponse?: boolean;
  } = {}
) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  let decision = onboarded,
    version = 0;
  const decisions: string[] = [];
  const writes: any[] = [];
  const uploads = new Map<string, any>();
  const confirmations = new Set<string>();
  const notices: any[] = [{ ...guide }];
  const order: any = {
    orderNumber: "PE-FILE",
    petIndex: 1,
    petName: "별이",
    guardianName: "보호자",
    taskId: 110,
    version: 0,
    kinds: ["MULTIVIEW", "MODEL_SOURCE", "PRINT_MODEL"],
    artifacts: [],
  };
  const plate: any = {
    id: 7,
    version: 0,
    status: "DRAFT",
    layoutRevision: 1,
    printerName: "X1C",
    printingAssigneeId: 2,
    printingAssigneeName: "제작자",
    orders: [],
    slots: [],
    artifacts: [],
    allowedActions: ["UPLOAD_BATCH_FILE"],
    blockingIssues: [],
  };
  await page.route("**/api/**", async route => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      method = request.method();
    let data: any = [];
    if (path === "/api/admin/me")
      data = {
        id: 1,
        name: owner ? "대표" : "제작자",
        role: owner ? "OWNER" : "PRODUCTION",
        workRoles: ["MODELING"],
        permissions: [
          "VIEW_ORDER_BASIC",
          "VIEW_PRODUCTION_FILES",
          "DOWNLOAD_PRODUCTION_FILES",
          "COMPLETE_MODELING",
          ...(owner ? ["VIEW_ALL_ORDERS", "MANAGE_OPERATION_SETTINGS"] : []),
        ],
      };
    else if (path === "/api/admin/notices/onboarding") {
      if (method === "POST") {
        decisions.push(request.postDataJSON().decision);
        decision = true;
        data = { recorded: true };
      } else data = { notice: decision ? null : guide };
    } else if (path === "/api/admin/notices") {
      if (method === "POST") {
        const body = request.postDataJSON();
        expect(request.headers()["idempotency-key"]).toBeTruthy();
        writes.push(body);
        const notice = { ...guide, ...body, id: 2, guideKey: null };
        notices.push(notice);
        data = notice;
      } else data = notices;
    } else if (/^\/api\/admin\/notices\/\d+$/.test(path)) {
      const id = Number(path.split("/").pop());
      const notice = notices.find(n => n.id === id);
      if (method === "PUT") {
        Object.assign(notice, request.postDataJSON(), {
          version: notice.version + 1,
        });
        writes.push(request.postDataJSON());
      }
      data = notice;
    } else if (path === "/api/production/file-targets")
      data = { orders: [order], plates: [plate] };
    else if (path.endsWith("/artifacts/upload-requests")) {
      const key = request.headers()["idempotency-key"];
      if (uploads.has(key)) data = uploads.get(key);
      else {
        const body = request.postDataJSON();
        writes.push({ path, ...body });
        order.version = ++version;
        data = {
          artifactId: "new-file",
          version,
          url: "https://storage.example.test/put",
          headers: { "Content-Type": "application/octet-stream" },
        };
        uploads.set(key, data);
      }
    } else if (path.endsWith("/artifacts/new-file/confirm")) {
      const key = request.headers()["idempotency-key"];
      if (!confirmations.has(key)) {
        confirmations.add(key);
        writes.push({ path, ...request.postDataJSON() });
        order.version = ++version;
        const artifact = {
          id: "new-file",
          fileName: path.includes("print-batches")
            ? "result.gcode.3mf"
            : "result.3mf",
          size: 26,
          kind: "PRINT_MODEL",
        };
        (path.includes("print-batches") ? plate : order).artifacts.push(
          artifact
        );
        if (loseConfirmResponse) {
          loseConfirmResponse = false;
          await route.abort();
          return;
        }
      }
      data = {};
    } else if (path.endsWith("/sales-summary"))
      data = {
        totalKrw: 0,
        monthKrw: 0,
        paidOrderCount: 0,
        currentMonth: "2026-11",
        months: [],
      };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route("https://storage.example.test/**", route =>
    route.fulfill({
      status: route.request().method() === "OPTIONS" ? 204 : 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
      body: "",
    })
  );
  return { decisions, writes, notices, order };
}

test("첫 안내를 미룬 뒤에도 공지를 읽고 대표가 Markdown 공지를 작성·수정한다", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/admin/operations");
  const modal = page.getByRole("dialog", { name: guide.title });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("heading", { name: "시작하기" })).toBeVisible();
  await modal.getByRole("button", { name: "다음에 하기" }).click();
  await expect(modal).toBeHidden();
  expect(state.decisions).toEqual(["DEFERRED"]);
  await page.getByRole("link", { name: "공지사항", exact: true }).click();
  await expect(page.getByRole("button", { name: "공지 작성" })).toBeVisible();
  await page.getByRole("button", { name: "공지 작성" }).click();
  await page.getByLabel("제목", { exact: true }).fill("제작 파일 공유 안내");
  await page
    .getByLabel("본문 (Markdown)")
    .fill(
      '## 업로드 규칙\n**아이를 확인해 주세요**\n[정상 링크](https://example.test/help)\n[위험 링크](javascript:alert(1))\n<script>window.noticeXss=true</script>\n<iframe src="https://example.test/frame"></iframe>'
    );
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  const preview = page.getByLabel("공지 미리보기");
  await expect(
    preview.getByRole("heading", { name: "업로드 규칙" })
  ).toBeVisible();
  await expect(preview.locator("script,iframe")).toHaveCount(0);
  await expect(preview.locator('a[href^="javascript:"]')).toHaveCount(0);
  await page.getByRole("button", { name: "게시", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "제작 파일 공유 안내", exact: true })
  ).toBeVisible();
  expect(state.writes).toHaveLength(1);
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByLabel("제목", { exact: true }).fill("수정한 공유 안내");
  await page.getByRole("button", { name: "수정 저장" }).click();
  await expect(
    page.getByRole("heading", { name: "수정한 공유 안내" })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: new RegExp(guide.title) }).click();
  await expect(
    page.getByRole("link", { name: "작업 폴더 연결 바로 가기" })
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("notices-desktop.png"),
  });
});

test("바로 가기는 폴더 연결 화면으로 이동하고 일반 담당자에게 글쓰기 권한이 없다", async ({
  page,
}) => {
  const state = await setup(page, { owner: false });
  await page.goto("/admin/operations");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "바로 가기" })
    .click();
  await expect(page).toHaveURL(/\/admin\/local-files$/);
  expect(state.decisions).toEqual(["OPENED"]);
  await page.getByRole("link", { name: "공지사항", exact: true }).click();
  await expect(page.getByRole("button", { name: "공지 작성" })).toHaveCount(0);
});

for (const os of ["Mac", "Windows"]) {
  test(`${os} Chrome에서 폴더를 생성하고 3MF를 등록하며 원본을 보존한다`, async ({
    page,
  }) => {
    const state = await setup(page, { onboarded: true });
    await page.addInitScript(
      ({ os }) => {
        Object.defineProperty(navigator, "userAgent", {
          get: () =>
            `Mozilla/5.0 (${os === "Mac" ? "Macintosh; Intel Mac OS X 10_15_7" : "Windows NT 10.0; Win64; x64"}) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36`,
        });
        (window as any).showDirectoryPicker = async (options: any) => {
          (window as any).pickerOptions = options;
          return navigator.storage.getDirectory();
        };
      },
      { os }
    );
    await page.goto("/admin/local-files");
    await page
      .getByRole("button", { name: "작업 폴더 연결", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "연결 폴더: PAW-EVER" })
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          await page.evaluate(async () => {
            try {
              const root = await navigator.storage.getDirectory();
              const paw = await root.getDirectoryHandle("PAW-EVER");
              const orders = await paw.getDirectoryHandle("주문");
              const order = await orders.getDirectoryHandle("PE-FILE");
              const pet = await order.getDirectoryHandle("아이2_별이");
              await pet.getDirectoryHandle("01_2D_4면도");
              await pet.getDirectoryHandle("04_채색3MF");
              const plates = await paw.getDirectoryHandle("플레이트");
              const plate = await plates.getDirectoryHandle("PB-7");
              await plate.getDirectoryHandle("05_슬라이서_3MF_Gcode");
              return true;
            } catch {
              return false;
            }
          })
      )
      .toBe(true);
    expect(await page.evaluate(() => (window as any).pickerOptions)).toEqual({
      mode: "readwrite",
      id: "pawever-workspace",
    });
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const paw = await root.getDirectoryHandle("PAW-EVER");
      const orders = await paw.getDirectoryHandle("주문");
      const order = await orders.getDirectoryHandle("PE-FILE");
      const pet = await order.getDirectoryHandle("아이2_별이");
      const output = await pet.getDirectoryHandle("03_출력모델");
      const file = await output.getFileHandle("result.3mf", { create: true });
      const stream = await file.createWritable();
      const bytes = new Uint8Array(26);
      bytes.set([80, 75, 3, 4, 80, 75, 5, 6]);
      await stream.write(bytes);
      await stream.close();
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "연결 폴더: PAW-EVER" })
    ).toBeVisible();
    await page.getByRole("button", { name: /^result\.3mf/ }).click();
    await expect(page.getByLabel("등록할 아이 · 플레이트")).toHaveValue(
      "order:PE-FILE:1"
    );
    await expect(page.getByLabel("자료 종류")).toHaveValue("PRINT_MODEL");
    await page.getByRole("button", { name: "선택 파일 서버에 등록" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "서버 등록 완료" })
    ).toContainText("서버 등록 완료");
    await expect(
      page.getByRole("heading", { name: "선택 대상의 서버 등록 자료 (1)" })
    ).toBeVisible();
    expect(state.writes[0]).toMatchObject({
      path: "/api/production/tasks/110/artifacts/upload-requests",
      kind: "PRINT_MODEL",
      fileName: "result.3mf",
      size: 26,
    });
    expect(state.writes[1]).toMatchObject({
      path: "/api/production/artifacts/new-file/confirm",
      version: 1,
    });
    await page.getByRole("button", { name: "연결 해제", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "작업 폴더 연결", exact: true })
    ).toBeVisible();
    expect(
      await page.evaluate(async () => {
        const root = await navigator.storage.getDirectory();
        const paw = await root.getDirectoryHandle("PAW-EVER");
        const orders = await paw.getDirectoryHandle("주문");
        const order = await orders.getDirectoryHandle("PE-FILE");
        const pet = await order.getDirectoryHandle("아이2_별이");
        const output = await pet.getDirectoryHandle("03_출력모델");
        return (await (await output.getFileHandle("result.3mf")).getFile())
          .size;
      })
    ).toBe(26);
    await page.screenshot({
      path: test.info().outputPath(`workspace-${os}.png`),
    });
  });
}

test("직접 선택한 슬라이서 3MF는 응답 유실 후 재시도해도 한 번만 등록된다", async ({
  page,
}) => {
  const state = await setup(page, {
    onboarded: true,
    loseConfirmResponse: true,
  });
  await page.goto("/admin/local-files?plate=7");
  const bytes = Buffer.alloc(26);
  bytes.set([80, 75, 3, 4, 80, 75, 5, 6]);
  await page.getByLabel("제작 파일 직접 선택").setInputFiles({
    name: "result.gcode.3mf",
    mimeType: "application/octet-stream",
    buffer: bytes,
  });
  await expect(page.getByLabel("등록할 아이 · 플레이트")).toHaveValue(
    "plate:7"
  );
  await page.getByRole("button", { name: "선택 파일 서버에 등록" }).click();
  await expect(page.getByRole("alert")).toContainText("Failed to fetch");
  await page.getByRole("button", { name: "선택 파일 서버에 등록" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "서버 등록 완료" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "선택 대상의 서버 등록 자료 (1)" })
  ).toBeVisible();
  expect(
    state.writes.filter(w => w.path?.endsWith("upload-requests"))
  ).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({
    path: "/api/production/print-batches/7/artifacts/upload-requests",
    fileName: "result.gcode.3mf",
  });
});

test("긴 첫 안내에서도 제목·본문 스크롤·버튼이 겹치지 않는다", async ({
  page,
}) => {
  guide.body +=
    "\n\n" +
    Array.from(
      { length: 40 },
      (_, i) =>
        `## 안내 ${i + 1}\n완성본은 주문과 아이별 폴더에 보관하고 등록할 대상을 확인해 주세요.`
    ).join("\n\n");
  await setup(page);
  await page.goto("/admin/operations");
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("heading", { name: "안내 40", exact: true })
  ).toHaveCount(1);
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 542, height: 904 },
  ]) {
    await page.setViewportSize(size);
    const sizes = await modal.evaluate(dialog => {
      const header = dialog.querySelector('[data-slot="dialog-header"]')!;
      const footer = dialog.querySelector('[data-slot="dialog-footer"]')!;
      const body = header.nextElementSibling!;
      return [header, body, footer].map(e => ({
        height: e.getBoundingClientRect().height,
        scroll: e.scrollHeight,
        top: e.getBoundingClientRect().top,
        bottom: e.getBoundingClientRect().bottom,
      }));
    });
    expect(sizes[0].height + 1).toBeGreaterThanOrEqual(sizes[0].scroll);
    expect(sizes[2].height + 1).toBeGreaterThanOrEqual(sizes[2].scroll);
    expect(sizes[0].bottom).toBeLessThanOrEqual(sizes[1].top);
    expect(sizes[1].bottom).toBeLessThanOrEqual(sizes[2].top);
    expect(sizes[1].scroll).toBeGreaterThan(sizes[1].height);
  }
});
