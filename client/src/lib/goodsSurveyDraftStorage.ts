import type { SurveyDraftSession } from "./goodsSurveyApi";

const STORAGE_KEY = "pawever:goods-survey-draft:v1";

export type GoodsSurveyDraftSnapshot = {
  questionnaireVersion: string;
  session: SurveyDraftSession;
  answers: Record<string, string | string[] | undefined>;
  currentQuestionId: string;
  questionActiveMs: Record<string, number>;
  surveyActiveMs: number;
  selectedGoods: string;
  stage: "questions" | "closing" | "story" | "production";
  savedAt: string;
};

export const loadGoodsSurveyDraft = (): GoodsSurveyDraftSnapshot | null => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoodsSurveyDraftSnapshot>;
    if (
      !parsed.session?.responseId ||
      !parsed.session.editToken ||
      !parsed.questionnaireVersion ||
      !parsed.answers ||
      !parsed.currentQuestionId ||
      !parsed.questionActiveMs ||
      typeof parsed.surveyActiveMs !== "number" ||
      !parsed.selectedGoods ||
      !parsed.stage
    ) {
      return null;
    }
    return parsed as GoodsSurveyDraftSnapshot;
  } catch {
    return null;
  }
};

export const saveGoodsSurveyDraftSnapshot = (
  snapshot: Omit<GoodsSurveyDraftSnapshot, "savedAt">
) => {
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...snapshot, savedAt: new Date().toISOString() })
    );
  } catch {
    // 브라우저 임시 저장 실패가 서버 저장이나 설문 진행을 막지 않게 한다.
  }
};

export const clearGoodsSurveyDraftSnapshot = () => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 이미 서버에 저장된 응답에는 영향이 없다.
  }
};
