import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeSurvey,
  createSurveyDraft,
  type SurveyDraftSession,
} from "./goodsSurveyApi";

describe("내부 설문 API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
