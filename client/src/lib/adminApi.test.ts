import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AdminApiError,
  adminSignIn,
  cancelAdminOrder,
  changeAdminOrderStatus,
  clearAdminToken,
  completeAdminPickup,
  downloadAdminPhotoArchive,
  listAdminOrders,
  readAdminRole,
  readAdminToken,
  requestPhotoLinks,
  writeAdminToken,
} from "./adminApi";

/** 세션 저장소가 없는 환경이라 최소한만 흉내 낸다. */
const createStorage = () => {
  const box = new Map<string, string>();
  return {
    getItem: (key: string) => box.get(key) ?? null,
    setItem: (key: string, value: string) => void box.set(key, value),
    removeItem: (key: string) => void box.delete(key),
    box,
  };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("관리자 API", () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal("window", { sessionStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("로그인하면 토큰을 세션에 두고, 이후 요청에 실어 보낸다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ success: true, data: { accessToken: "token-1" } })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: { orders: [], totalCount: 0, page: 0, size: 20, summary: {} },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await adminSignIn("admin@pawever.kr", "password-1234");
    expect(readAdminToken()).toBe("token-1");

    await listAdminOrders({});

    const [, init] = fetchMock.mock.calls[1];
    expect(init.headers.Authorization).toBe("Bearer token-1");
  });

  it("로그인 요청 자체에는 토큰을 싣지 않는다", async () => {
    writeAdminToken("stale-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: true, data: { accessToken: "token-2" } })
      );
    vi.stubGlobal("fetch", fetchMock);

    await adminSignIn("admin@pawever.kr", "password-1234");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("401 이 오면 들고 있던 토큰을 버린다", async () => {
    // 만료된 토큰을 들고 있으면 다음 요청도 같은 결과다. 화면이 로그인으로
    // 돌아가지 못하고 오류만 반복해서 보여 준다.
    writeAdminToken("expired-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ success: false, code: "UNAUTHORIZED" }, 401)
      )
    );

    await expect(listAdminOrders({})).rejects.toSatisfy(
      (error: AdminApiError) => error.needsSignIn
    );
    expect(readAdminToken()).toBeNull();
  });

  it("403 은 토큰을 버리지 않는다", async () => {
    // 제작팀이 관리자 전용 요청을 부른 경우다. 로그인은 살아 있다.
    writeAdminToken("live-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ success: false, code: "FORBIDDEN" }, 403)
      )
    );

    await expect(
      changeAdminOrderStatus("PE-2026-000001", "SHIPPED")
    ).rejects.toBeInstanceOf(AdminApiError);
    expect(readAdminToken()).toBe("live-token");
  });

  it("상태 여러 개는 같은 이름으로 하나씩 붙인다", async () => {
    // 쉼표로 이어 붙이면 서버가 값 하나로 읽고 아무것도 걸리지 않는다.
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { orders: [], totalCount: 0, page: 0, size: 20, summary: {} },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await listAdminOrders({
      status: ["PAYMENT_COMPLETED", "IN_PRODUCTION"],
      page: 2,
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("status=PAYMENT_COMPLETED");
    expect(url).toContain("status=IN_PRODUCTION");
    expect(url).toContain("page=2");
  });

  it("빈 검색어는 아예 보내지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { orders: [], totalCount: 0, page: 0, size: 20, summary: {} },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await listAdminOrders({ q: "   " });

    const [url] = fetchMock.mock.calls[0];
    expect(url).not.toContain("q=");
  });

  it("제출일과 사진 수 조건을 붙여 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { orders: [], totalCount: 0, page: 0, size: 20, summary: {} },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await listAdminOrders({
      submittedFrom: "2026-08-01",
      submittedTo: "2026-08-20",
      minPhotoCount: 5,
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("submittedFrom=2026-08-01");
    expect(url).toContain("submittedTo=2026-08-20");
    expect(url).toContain("minPhotoCount=5");
  });

  it("비어 있는 조건은 아예 보내지 않는다", async () => {
    // 빈 값을 그대로 실으면 서버가 날짜 형식이 아니라며 400 을 돌려준다.
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { orders: [], totalCount: 0, page: 0, size: 20, summary: {} },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await listAdminOrders({ submittedFrom: undefined, minPhotoCount: undefined });

    const [url] = fetchMock.mock.calls[0];
    expect(url).not.toContain("submittedFrom");
    expect(url).not.toContain("minPhotoCount");
  });

  it("사진 묶음은 봉투 없이 파일로 받는다", async () => {
    // ApiResponse 로 감싸면 zip 바이트가 JSON 안에 들어가 못 쓴다.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(["zip"]), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    writeAdminToken("token-zip");

    const archive = await downloadAdminPhotoArchive("PE-2026-000001");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/orders/PE-2026-000001/photos.zip");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token-zip");
    expect(archive.fileName).toBe("PE-2026-000001_photos.zip");
  });

  it("사진 링크는 POST 로 받는다", async () => {
    // GET 이면 주소창과 방문 기록에 남는다. 서버도 POST 로만 이력을 남긴다.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, data: { photos: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await requestPhotoLinks("PE-2026-000001");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/orders/PE-2026-000001/photo-links");
    expect(init.method).toBe("POST");
  });

  it("토큰에서 역할을 읽어 화면을 나눈다", () => {
    const claims = Buffer.from(JSON.stringify({ sub: "1", role: "PRODUCTION" }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    writeAdminToken(`header.${claims}.signature`);

    expect(readAdminRole()).toBe("PRODUCTION");
  });

  it("읽을 수 없는 토큰이면 역할을 모르는 것으로 둔다", () => {
    // 여기서 예외가 나가면 화면 전체가 빈 채로 멈춘다.
    writeAdminToken("이건.토큰이.아니다");
    expect(readAdminRole()).toBeNull();

    clearAdminToken();
    expect(readAdminRole()).toBeNull();
  });

  it("취소 사유를 본문으로 보낸다", async () => {
    // 주소에 실으면 사유가 방문 기록과 중간 프록시에 남는다.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    await cancelAdminOrder("PE-2026-000101", "사진 품질 미달");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/orders/PE-2026-000101/cancel");
    expect(url).not.toContain("사진 품질 미달");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ reason: "사진 품질 미달" });
  });

  it("수령 완료는 송장 없이 POST 한 번으로 보낸다", async () => {
    // 현장 수령에는 택배사도 송장번호도 없다. 본문에 넣을 것이 없다.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    await completeAdminPickup("PE-2026-000201");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/orders/PE-2026-000201/pickup-complete");
    expect(init.method).toBe("POST");
  });

  it("로그아웃하면 토큰이 남지 않는다", () => {
    writeAdminToken("token-3");
    clearAdminToken();
    expect(readAdminToken()).toBeNull();
    expect(storage.box.size).toBe(0);
  });
});
