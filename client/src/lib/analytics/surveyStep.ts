// 노션 "GTM 등 UX 사용자 트래킹 코드 구현" 문서의 STEP 1~15 정의를 코드 화면에 맞춘다.
// 구분선(--- ---)이 나눈 질문 13페이지가 STEP 1~13, 사연 페이지가 14, 굿즈 제작 정보가 15다.
// 코드의 closing 화면은 노션에 없는 전환 화면이라 단계 번호를 주지 않는다.

export const SURVEY_QUESTION_STEP_MAX = 13;
export const SURVEY_STORY_STEP = 14;
export const SURVEY_PRODUCTION_STEP = 15;
export const SURVEY_STEP_TOTAL = SURVEY_PRODUCTION_STEP;

export type SurveyStepSource =
  | { stage: "questions"; page: number }
  | { stage: Exclude<string, "questions">; page?: number };

export const surveyStepOf = (source: SurveyStepSource): number | null => {
  if (source.stage === "story") return SURVEY_STORY_STEP;
  if (source.stage === "production") return SURVEY_PRODUCTION_STEP;
  if (source.stage !== "questions") return null;

  const page = source.page ?? 0;
  if (!Number.isInteger(page)) return null;
  // 질문 페이지가 13을 넘으면 사연·굿즈 단계 번호와 겹친다.
  // 조용히 뭉개면 보고서가 틀리므로 아예 단계로 세지 않는다.
  if (page < 1 || page > SURVEY_QUESTION_STEP_MAX) return null;
  return page;
};

export const surveyStepLabel = (step: number) => {
  const padded = String(step).padStart(2, "0");
  if (step === SURVEY_STORY_STEP) return `STEP ${padded} 사연`;
  if (step === SURVEY_PRODUCTION_STEP) return `STEP ${padded} 굿즈 제작 정보`;
  return `STEP ${padded} 설문`;
};

/**
 * 단계별 방문 횟수와 가장 멀리 간 단계를 들고 있는다.
 * 노션 8번(같은 단계 반복 방문)과 9번(이탈 지점)이 이 기록을 쓴다.
 */
export class StepVisitLog {
  private visits = new Map<number, number>();
  private openToken = "";
  furthest = 0;
  last = 0;

  /** 단계에 들어갈 때 부르고, 그 단계의 누적 방문 횟수를 돌려준다. */
  enter(step: number) {
    const count = (this.visits.get(step) ?? 0) + 1;
    this.visits.set(step, count);
    this.last = step;
    if (step > this.furthest) this.furthest = step;
    return count;
  }

  /**
   * 화면이 실제로 바뀐 진입만 센다.
   *
   * 같은 단계가 리렌더로 다시 잡히면 null을 돌려 중복 집계를 막고,
   * 노션 STEP이 아닌 화면(step === null, 안내·전환 화면)으로 나가면
   * 표시를 지운다. 그래야 "이전 → 안내 화면 → 다시 시작"처럼
   * 같은 단계로 돌아온 경우를 재진입으로 다시 셀 수 있다.
   */
  enterOnce(step: number | null) {
    if (step === null) {
      this.openToken = "";
      return null;
    }
    const token = String(step);
    if (this.openToken === token) return null;
    this.openToken = token;
    return this.enter(step);
  }

  visitCount(step: number) {
    return this.visits.get(step) ?? 0;
  }

  reset() {
    this.visits.clear();
    this.openToken = "";
    this.furthest = 0;
    this.last = 0;
  }
}
