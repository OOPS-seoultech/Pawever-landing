import type { GoodsSalesChannel } from "@/lib/goodsSurveyApi";
export const landingPathFor = (channel: GoodsSalesChannel): string =>
  channel === "flea" ? "/flea" : "/goods-survey";
