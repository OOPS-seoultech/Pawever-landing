import type { GoodsSalesChannel, SurveyDraftSession } from "./goodsSurveyApi";
const STORAGE_KEY = "pawever:goods-order-draft";
type OrderDraft = { channel: GoodsSalesChannel; session: SurveyDraftSession };
export const loadGoodsSurveyDraft = (): OrderDraft | null => {
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) ?? "null"
    );
    if (
      !parsed ||
      !["online", "flea"].includes(parsed.channel) ||
      typeof parsed.session?.responseId !== "string" ||
      !parsed.session.responseId ||
      typeof parsed.session?.editToken !== "string" ||
      !parsed.session.editToken
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
};
export const saveGoodsSurveyDraftSnapshot = (draft: OrderDraft) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* 서버 접수는 계속할 수 있다. */
  }
};
export const clearGoodsSurveyDraftSnapshot = () => {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 서버에 접수된 주문에는 영향이 없다. */
  }
};
