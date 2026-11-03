import { beforeEach, expect, it, vi } from "vitest";
import {
  clearGoodsSurveyDraftSnapshot,
  loadGoodsSurveyDraft,
  saveGoodsSurveyDraftSnapshot,
} from "./goodsSurveyDraftStorage";
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
  });
});
it("채널과 편집 토큰을 가진 주문 세션만 복원한다", () => {
  const draft = {
    channel: "online" as const,
    session: {
      responseId: "response-1",
      editToken: "token-1",
      status: "RESERVED",
      remaining: 99,
    },
  };
  saveGoodsSurveyDraftSnapshot(draft);
  expect(loadGoodsSurveyDraft()).toEqual(draft);
  clearGoodsSurveyDraftSnapshot();
  expect(loadGoodsSurveyDraft()).toBeNull();
  for (const value of [
    "{",
    "{}",
    '{"channel":"online","session":{"responseId":"r"}}',
  ]) {
    storage.set("pawever:goods-order-draft", value);
    expect(loadGoodsSurveyDraft()).toBeNull();
  }
});
