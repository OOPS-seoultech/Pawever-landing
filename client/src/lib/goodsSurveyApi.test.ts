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

  /**
   * 닿지 않는 망에서 하염없이 기다리지 않는다.
   *
   * 2026-09-08 밤, 학교 와이파이에 붙은 폰에서 신청 화면이 "신청서를
   * 준비하고 있어요"에서 넘어가지 않았다. 그 망이 API 를 막고 있었는데,
   * 요청에 시한이 없어 오류도 안 나고 다시 시도할 자리도 없었다. 현장에서
   * 이러면 줄이 선 채로 아무것도 못 한다.
   */
  it("망이 닿지 않으면 무엇을 해 볼지 적은 오류로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );

    await expect(
      createSurveyDraft({
        questionnaireVersion: "2026-07-23-v1",
        selectedGoods: "figure",
        tracking: { visitId: "visit-1" },
      })
    ).rejects.toMatchObject({
      code: "NETWORK_UNREACHABLE",
      message: expect.stringContaining("데이터"),
    });
  });

  it("모든 요청이 시한을 달고 나간다", async () => {
    // 끊어 주는 망은 곧장 실패하지만 조용히 버리는 망은 영영 답이 없다.
    // 그때는 시한이 유일하게 사람을 화면에서 놓아 주는 것이다.
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

    await createSurveyDraft({
      questionnaireVersion: "2026-07-23-v1",
      selectedGoods: "figure",
      tracking: { visitId: "visit-1" },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("시한이 지나 끊긴 것도 같은 안내로 바꾼다", async () => {
    // 브라우저가 시한을 넘기면 AbortError 를 던진다. 사람에게는 닿지 않은
    // 것과 같은 일이므로 같은 말을 해야 한다.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError"))
    );

    await expect(
      createSurveyDraft({
        questionnaireVersion: "2026-07-23-v1",
        selectedGoods: "figure",
        tracking: { visitId: "visit-1" },
      })
    ).rejects.toMatchObject({ code: "NETWORK_UNREACHABLE" });
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
