import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeSurvey,
  createSurveyDraft,
  submitSurveyApplication,
  unsubscribeSurveyNotice,
  type SurveyDraftSession,
} from "./goodsSurveyApi";

describe("내부 설문 API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("같은 출처의 /api 경로로 익명 초안을 만들고 편집 토큰을 받는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            responseId: "response-1",
            editToken: "edit-token",
            status: "DRAFT",
            remaining: 73,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createSurveyDraft({
      questionnaireVersion: "2026-07-23-v1",
      selectedGoods: "acrylic",
      tracking: { visitId: "visit-1" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/goods-survey/responses",
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({
      responseId: "response-1",
      editToken: "edit-token",
      status: "DRAFT",
      remaining: 73,
    });
  });

  it("설문 완료 요청에는 편집 토큰과 서버 저장용 활성시간을 함께 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            responseId: "response-1",
            status: "RESERVED",
            remaining: 72,
            reservationExpiresAt: "2026-07-24T09:15:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const session: SurveyDraftSession = {
      responseId: "response-1",
      editToken: "edit-token",
      status: "DRAFT",
      remaining: 73,
    };

    await completeSurvey(session, {
      answers: { q1: "current_only" },
      currentQuestionId: "q33",
      surveyActiveMs: 120_000,
      questionActiveMs: { q1: 3_000 },
      tracking: { visitId: "visit-1" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/goods-survey/responses/response-1/complete",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Survey-Edit-Token": "edit-token",
        }),
      })
    );
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(options.body))).toMatchObject({
      surveyActiveMs: 120_000,
      questionActiveMs: { q1: 3_000 },
    });
  });

  it("배포 환경에서는 설정한 API origin으로 직접 요청한다", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.pawever.kr/");
    vi.resetModules();
    const { getSurveyCampaign } = await import("./goodsSurveyApi");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            campaignId: "goods-2026-07",
            capacity: 100,
            allocated: 27,
            remaining: 73,
            startsAt: "2026-07-23T00:00:00Z",
            endsAt: "2026-08-05T00:00:00Z",
            open: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await getSurveyCampaign();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.pawever.kr/api/public/goods-survey/campaign",
      expect.any(Object)
    );
  });

  it("제작 신청에는 사진별 공개 동의 ID를 일반 사진 ID와 분리해 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            responseId: "response-1",
            applicationId: 1,
            status: "SUBMITTED",
            remaining: 72,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const session: SurveyDraftSession = {
      responseId: "response-1",
      editToken: "edit-token",
      status: "RESERVED",
      remaining: 72,
    };

    await submitSurveyApplication(session, "idempotency-1", {
      goodsType: "acrylic",
      customGoods: "",
      petName: "몽이",
      guardianName: "보호자",
      phone: "01012345678",
      postalCode: "01234",
      address: "서울시 노원구",
      addressDetail: "",
      photoIds: ["photo-public", "photo-private"],
      publicPhotoIds: ["photo-public"],
      conversionEventId: "conversion-1",
      tracking: { visitId: "visit-1" },
      privacyAgreed: true,
      shippingConfirmed: true,
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(options.body))).toMatchObject({
      photoIds: ["photo-public", "photo-private"],
      publicPhotoIds: ["photo-public"],
    });
  });
  it("수신거부는 값을 주소가 아니라 본문으로 보낸다", async () => {
    // 주소에 실으면 링크를 거치는 모든 곳에 남는다. 이메일이든 서명값이든
    // URL 에 들어가는 순간 우리가 통제하지 못하는 자리에 복사된다.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await unsubscribeSurveyNotice("서명된-값");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/public/goods-survey/notice-subscriptions/unsubscribe");
    expect(url).not.toContain("서명된-값");
    expect(url).not.toContain("?");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ token: "서명된-값" });
  });
});
