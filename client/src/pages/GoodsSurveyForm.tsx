import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Info,
  LockKeyhole,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  createSubmissionTrackingContext,
  setSurveyPhaseContext,
  trackEvent,
} from "@/lib/analytics/analytics";
import { useActiveTime, usePageEngagement } from "@/lib/analytics/react";
import {
  StepVisitLog,
  surveyStepLabel,
  surveyStepOf,
} from "@/lib/analytics/surveyStep";
import {
  GOODS_SURVEY_CAPACITY,
  GOODS_SURVEY_VERSION,
  GOODS_UNSELECTED,
  GoodsSurveyApiError,
  completeSurvey as completeSurveyRequest,
  createSurveyDraft,
  getSurveyCampaign,
  saveSurveyDraft,
  saveSurveyStory,
  submitSurveyApplication,
  subscribeSurveyNotice,
  uploadSurveyPhoto,
  type SurveyCampaign,
  type SurveyDraftSession,
} from "@/lib/goodsSurveyApi";
import {
  clearGoodsSurveyDraftSnapshot,
  loadGoodsSurveyDraft,
  saveGoodsSurveyDraftSnapshot,
} from "@/lib/goodsSurveyDraftStorage";
import {
  FREE_TEXT_MAX_LENGTH,
  freeTextKey,
  getNextMultiSelection,
  getNextSingleSelection,
  getQuestionNotice,
  getQuestionOptions,
  getQuestionTitle,
  isFreeTextOpen,
  pruneHiddenAnswers,
  type SurveyOption,
  findScreenIndex,
  getScreenBlocks,
  getSurveyProgress,
  getVisibleQuestions,
  getVisibleScreens,
  hasMinimumAnswers,
  isSurveyTerminated,
  type SurveyAnswers,
  type SurveyQuestion,
} from "./goodsSurveySchema";
import {
  GOODS_PRICE,
  wonText,
  goodsSurveyClosingContent,
  goodsSurveyIntroContent,
  goodsSurveyPrivacyContent,
  goodsSurveyProductionContent,
  goodsSurveyStoryContent,
} from "./goodsSurveyContent";
import "./GoodsSurveyForm.css";

type SurveyStage =
  | "intro"
  | "questions"
  | "closing"
  | "story"
  | "production"
  | "complete"
  | "full"
  | "terminated";

type PersistedSurveyStage = "questions" | "closing" | "story" | "production";

type StoryFields = {
  status: string;
  age: string;
  condition: string;
  scene: string;
  changedDay: string;
  startedNow: string;
  unsaidSearch: string;
  neededHelp: string;
  postponed: string;
  wishKnownEarlier: string;
  finalHelp: string;
  oneLine: string;
};

// 굿즈 발송 안내를 문자로 보내므로 휴대폰 번호만 받는다.
const PHONE_PATTERN = /^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/;

// 접힌 카드의 요약 칩과 트랙 양끝 라벨. 저장값은 1~5 그대로이며
// 문장형 전체 표기는 문항이 가진 선택지 라벨을 쓴다.
const SCALE_SHORT_LABELS = [
  "전혀 아니다",
  "아니다",
  "보통",
  "그렇다",
  "매우 그렇다",
];

type ConsentValue = boolean | null;

type StoryConsent = {
  analysis: ConsentValue;
  publish: ConsentValue;
};

type ProductionFields = {
  goods: string;
  customGoods: string;
  petName: string;
  guardianName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
};

const productionGoods = [
  ["acrylic", "아크릴 얼굴 키링"],
  ["face", "3D 얼굴 키링"],
  ["backplate", "뒷판형 3D 얼굴 키링"],
  ["figure", "3D 전신 피규어"],
  ["custom", "원하는 형태 직접 제안"],
] as const;

const emptyStory: StoryFields = {
  status: "",
  age: "",
  condition: "",
  scene: "",
  changedDay: "",
  startedNow: "",
  unsaidSearch: "",
  neededHelp: "",
  postponed: "",
  wishKnownEarlier: "",
  finalHelp: "",
  oneLine: "",
};

const createClientId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const getFileKey = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

// 화면 분기를 이 값으로만 판단한다. 라벨을 직접 비교하면
// 문구가 바뀔 때 조건이 조용히 어긋난다.
export const STORY_STATUS = {
  living: "함께 살고 있다",
  departed: "이별했다",
  undisclosed: "답하고 싶지 않다",
} as const;

export const storySelects = {
  status: [
    STORY_STATUS.living,
    STORY_STATUS.departed,
    STORY_STATUS.undisclosed,
  ],
  age: ["2세 이하", "3~5세", "6~8세", "9~11세", "12세 이상", "잘 모르겠다"],
  condition: [
    "건강한 일상",
    "작은 노화나 이상 변화",
    "질환 진단 후 관리",
    "지속적인 간호나 마지막 돌봄",
    "갑작스러운 이별 또는 이별 후",
  ],
};

function FieldLabel({
  children,
  optional = false,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="gsf-field-label">
      {children}
      <em>{optional ? "선택" : "필수"}</em>
    </span>
  );
}

function EmphasizedCopy({
  text,
  emphasis,
}: {
  text: string;
  emphasis: string;
}) {
  const emphasisStart = text.indexOf(emphasis);
  if (emphasisStart < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, emphasisStart)}
      <strong>{emphasis}</strong>
      {text.slice(emphasisStart + emphasis.length)}
    </>
  );
}

function StoryTextarea({
  label,
  prompt,
  value,
  onChange,
  maxLength,
  recommended,
  optional = true,
}: {
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  recommended: string;
  optional?: boolean;
}) {
  return (
    <label className="gsf-story-field">
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <span className="gsf-field-prompt">{prompt}</span>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        maxLength={maxLength}
        rows={5}
        placeholder="떠오르는 장면을 편안하게 적어 주세요."
      />
      <small>
        {recommended} · 현재 {value.length.toLocaleString()} /{" "}
        {maxLength.toLocaleString()}자
      </small>
    </label>
  );
}

function ConsentChoice({
  name,
  label,
  value,
  onChange,
  required = false,
}: {
  name: string;
  label: string;
  value: ConsentValue;
  onChange: (value: boolean) => void;
  required?: boolean;
}) {
  // fieldset/legend를 쓰면 legend가 flex 아이템이 되지 않아 항상 줄이 나뉜다.
  // 질문과 예·아니요를 한 줄에 두려면 일반 요소여야 한다.
  return (
    <div className="gsf-consent-question" role="radiogroup" aria-label={label}>
      <span className="gsf-consent-question-label">
        {label} <em>{required ? "필수" : "선택"}</em>
      </span>
      <div>
        <label>
          <input
            type="radio"
            name={name}
            checked={value === true}
            onChange={() => onChange(true)}
          />
          <span>예</span>
        </label>
        <label>
          <input
            type="radio"
            name={name}
            checked={value === false}
            onChange={() => onChange(false)}
          />
          <span>아니요</span>
        </label>
      </div>
    </div>
  );
}

export function QuestionScreen({
  question,
  answers,
  onAnswer,
  onFreeText,
}: {
  question: SurveyQuestion;
  answers: SurveyAnswers;
  onAnswer: (value: string | string[]) => void;
  onFreeText?: (value: string) => void;
}) {
  const options = getQuestionOptions(question, answers);
  const notice = getQuestionNotice(question, answers);
  const answer = answers[question.id];
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
  const freeTextOpen = isFreeTextOpen(question, answers);
  const storedFreeText = answers[freeTextKey(question.id)];
  const freeText = typeof storedFreeText === "string" ? storedFreeText : "";

  const toggleOption = (optionId: string) => {
    if (question.kind !== "multi") {
      // 고른 항목을 다시 누르면 취소된다. 버튼이 aria-pressed를 쓰는 토글이라
      // 눌러서 끄는 동작이 자연스럽고, 건너뛸 문항에서 실수를 되돌릴 수 있다.
      onAnswer(getNextSingleSelection(selected, optionId));
      return;
    }

    onAnswer(
      getNextMultiSelection({
        selected,
        optionId,
        exclusiveOptionIds: question.exclusiveOptionIds,
        maxSelections: question.maxSelections ?? options.length,
      })
    );
  };

  return (
    <section className="gsf-question" aria-labelledby={`title-${question.id}`}>
      {notice && (
        <div className="gsf-notice">
          <Info aria-hidden="true" />
          <div>
            <strong>{notice.title}</strong>
            {notice.paragraphs.map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      <div className="gsf-question-heading">
        <span>{question.number}</span>
        <small>{question.section}</small>
      </div>

      <h2 id={`title-${question.id}`}>{getQuestionTitle(question, answers)}</h2>
      {question.helper && <p className="gsf-helper">{question.helper}</p>}
      {(question.optional || question.skippable) && (
        <p className="gsf-helper">답하기 어려우면 건너뛰어도 괜찮아요.</p>
      )}

      <div
        className="gsf-options"
        role={question.kind === "multi" ? "group" : "radiogroup"}
        aria-label={getQuestionTitle(question, answers)}
      >
        {options.map((option, index) => {
          const isSelected = selected.includes(option.id);
          const nonExclusiveSelectionCount = selected.filter(
            id => !question.exclusiveOptionIds?.includes(id)
          ).length;
          const isExclusive =
            question.exclusiveOptionIds?.includes(option.id) ?? false;
          const isMaxed =
            question.kind === "multi" &&
            !isSelected &&
            !isExclusive &&
            nonExclusiveSelectionCount >=
              (question.maxSelections ?? options.length);

          return (
            <button
              type="button"
              className={`gsf-option${isSelected ? " is-selected" : ""}`}
              key={option.id}
              onClick={() => toggleOption(option.id)}
              aria-pressed={isSelected}
              disabled={isMaxed}
            >
              <span className="gsf-option-index">
                {isSelected ? <Check aria-hidden="true" /> : index + 1}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {freeTextOpen && (
        <label className="gsf-free-text">
          <span>어떤 것인지 적어 주세요.</span>
          <input
            value={freeText}
            onChange={event => onFreeText?.(event.target.value)}
            maxLength={FREE_TEXT_MAX_LENGTH}
            placeholder="직접 입력"
          />
          <small>
            {freeText.length} / {FREE_TEXT_MAX_LENGTH}자
          </small>
        </label>
      )}
    </section>
  );
}

/** 같은 매트릭스의 행들을 한 화면에 놓고 바로바로 고르게 한다. */
export function MatrixScreen({
  questions,
  answers,
  onAnswer,
}: {
  questions: SurveyQuestion[];
  answers: SurveyAnswers;
  onAnswer: (questionId: string, value: string) => void;
}) {
  const first = questions[0];
  const notice = getQuestionNotice(first, answers);
  const scale = getQuestionOptions(first, answers);

  const answerOf = (question: SurveyQuestion) => {
    const value = answers[question.id];
    return typeof value === "string" ? value : "";
  };
  const doneCount = questions.filter(question => answerOf(question)).length;

  // 답할 항목 하나만 펼친다. 처음엔 첫 미응답 항목.
  const [openId, setOpenId] = useState<string | null>(
    () => questions.find(question => !answerOf(question))?.id ?? null
  );
  // 자동으로 펼친 항목만 스크롤 보정 대상이다.
  // 사용자가 직접 접힌 카드를 누른 경우는 이미 눈에 보이는 위치라 건드리지 않는다.
  const [autoOpened, setAutoOpened] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!autoOpened) return;
    setAutoOpened(null);

    const node = cardRefs.current.get(autoOpened);
    if (!node) return;

    // 화면 안에 다 보이면 아무것도 하지 않는다. 밀려난 만큼만 움직인다.
    const margin = 16;
    const bottomBar = document.querySelector(".gsf-bottom-actions");
    const reserved = bottomBar?.getBoundingClientRect().height ?? 0;
    const rect = node.getBoundingClientRect();
    const limit = window.innerHeight - reserved - margin;

    let delta = 0;
    if (rect.bottom > limit) delta = rect.bottom - limit;
    else if (rect.top < margin) delta = rect.top - margin;
    if (delta === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollBy({ top: delta, behavior: reduceMotion ? "auto" : "smooth" });
  }, [autoOpened]);

  const openCard = (questionId: string) => {
    setOpenId(questionId);
    setAutoOpened(null);
  };

  const select = (question: SurveyQuestion, optionId: string) => {
    const changed = answerOf(question) !== optionId;
    onAnswer(question.id, optionId);
    if (!changed) return;
    // 값이 바뀔 때만 다음 미응답 항목으로 넘어간다. 남은 게 없으면 모두 접는다.
    const next = questions.find(
      item => item.id !== question.id && !answerOf(item)
    );
    setOpenId(next?.id ?? null);
    setAutoOpened(next?.id ?? null);
  };

  const moveByKey = (
    event: React.KeyboardEvent,
    question: SurveyQuestion,
    options: SurveyOption[]
  ) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const current = options.findIndex(
      option => option.id === answerOf(question)
    );
    const next = Math.min(
      options.length - 1,
      Math.max(0, (current < 0 ? 0 : current) + step)
    );
    onAnswer(question.id, options[next].id);
  };

  return (
    <section className="gsf-question" aria-labelledby={`title-${first.id}`}>
      {notice && (
        <div className="gsf-notice">
          <Info aria-hidden="true" />
          <div>
            <strong>{notice.title}</strong>
            {notice.paragraphs.map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      <div className="gsf-question-heading">
        <span>{first.number}</span>
        <small>
          {doneCount} / {questions.length} 완료
        </small>
      </div>

      <h2 id={`title-${first.id}`}>{getQuestionTitle(first, answers)}</h2>

      <div className="gsf-scale-list">
        {questions.map((question, order) => {
          const options = getQuestionOptions(question, answers);
          const value = answerOf(question);
          const chosen = options.findIndex(option => option.id === value);
          const open = openId === question.id;
          const row = question.matrix?.row ?? "";

          if (!open) {
            return (
              <button
                type="button"
                key={question.id}
                ref={node => {
                  if (node) cardRefs.current.set(question.id, node);
                  else cardRefs.current.delete(question.id);
                }}
                className={`gsf-scale-card is-collapsed${value ? " is-done" : ""}`}
                onClick={() => openCard(question.id)}
              >
                <span className="gsf-scale-badge">{order + 1}</span>
                <span className="gsf-scale-row">{row}</span>
                {value && (
                  <span className="gsf-scale-chip">
                    {SCALE_SHORT_LABELS[chosen] ?? ""}
                  </span>
                )}
              </button>
            );
          }

          return (
            <div
              className="gsf-scale-card is-open"
              key={question.id}
              ref={node => {
                if (node) cardRefs.current.set(question.id, node);
                else cardRefs.current.delete(question.id);
              }}
            >
              <div className="gsf-scale-head">
                <span className="gsf-scale-badge">{order + 1}</span>
                <span className="gsf-scale-row">{row}</span>
              </div>

              <div
                className="gsf-scale-track"
                role="radiogroup"
                aria-label={row}
                onKeyDown={event => moveByKey(event, question, options)}
              >
                {options.map((option, index) => (
                  <button
                    type="button"
                    key={option.id}
                    role="radio"
                    aria-checked={value === option.id}
                    aria-label={`${row} — ${option.label}`}
                    tabIndex={index === (chosen < 0 ? 0 : chosen) ? 0 : -1}
                    className={value === option.id ? "is-selected" : ""}
                    onClick={() => select(question, option.id)}
                  />
                ))}
              </div>

              <p className="gsf-scale-anchors" aria-hidden="true">
                <span>{SCALE_SHORT_LABELS[0]}</span>
                <span>{SCALE_SHORT_LABELS[SCALE_SHORT_LABELS.length - 1]}</span>
              </p>

              <p className="gsf-scale-value" aria-live="polite">
                {chosen >= 0 ? options[chosen].label : "탭해서 선택하세요"}
              </p>
            </div>
          );
        })}
      </div>

      <p className="gsf-sr-only">
        {scale.length}단계 중 하나를 고르는 문항입니다.
      </p>
    </section>
  );
}

export default function GoodsSurveyForm() {
  const [, setLocation] = useLocation();
  // 랜딩에서 굿즈를 고르지 않고 바로 들어올 수 있다. 고르지 않았다는 사실도
  // 선호 데이터라, 빈자리를 임의의 굿즈로 채우지 않는다.
  const initialGoods = useMemo(() => {
    const requested = new URLSearchParams(window.location.search).get("goods");
    return requested && productionGoods.some(([id]) => id === requested)
      ? requested
      : GOODS_UNSELECTED;
  }, []);
  const restoredDraft = useMemo(() => {
    const draft = loadGoodsSurveyDraft();
    if (
      draft?.questionnaireVersion !== GOODS_SURVEY_VERSION ||
      draft.selectedGoods !== initialGoods
    ) {
      return null;
    }
    return draft;
  }, [initialGoods]);
  const [stage, setStage] = useState<SurveyStage>("intro");
  const [answers, setAnswers] = useState<SurveyAnswers>(() =>
    pruneHiddenAnswers(restoredDraft?.answers ?? {})
  );
  const [currentQuestionId, setCurrentQuestionId] = useState(
    () => restoredDraft?.currentQuestionId ?? "q1"
  );
  const [draftSession, setDraftSession] = useState<SurveyDraftSession | null>(
    () => restoredDraft?.session ?? null
  );
  const [questionActiveMs, setQuestionActiveMs] = useState<
    Record<string, number>
  >(() => restoredDraft?.questionActiveMs ?? {});
  const [surveyActiveBaseMs, setSurveyActiveBaseMs] = useState(
    () => restoredDraft?.surveyActiveMs ?? 0
  );
  const [story, setStory] = useState<StoryFields>(emptyStory);
  const [storyConsent, setStoryConsent] = useState<StoryConsent>({
    analysis: null,
    publish: null,
  });
  const [production, setProduction] = useState<ProductionFields>({
    // 랜딩에서 고르지 않았으면 비워 둔다. 제작 단계에서 직접 고르게 한다.
    goods: initialGoods === GOODS_UNSELECTED ? "" : initialGoods,
    customGoods: "",
    petName: "",
    guardianName: "",
    phone: "",
    postalCode: "",
    address: "",
    addressDetail: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [shippingConsent, setShippingConsent] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [reviewId, setReviewId] = useState("");
  // 서버가 알려주기 전까지 쓰는 값이다. 임의의 숫자를 두면 사실과 다른 수가
  // 잠깐 보일 수 있으므로 아직 아무도 신청하지 않은 상태로 둔다.
  const [remaining, setRemaining] = useState(
    () => restoredDraft?.session.remaining ?? GOODS_SURVEY_CAPACITY
  );
  // 굿즈 접수 여부. 설문과 별개로 열리고 닫히므로 화면 문구와 마지막 갈림길에서 쓴다.
  // 조회 전에는 닫힌 것으로 본다. 못 줄 것을 준다고 적는 쪽이 더 나쁘다.
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const goodsAvailable = campaign?.goodsOpen ?? false;
  // 분석에 실을 굿즈 값. 아직 고르지 않았으면 고르지 않았다고 남긴다.
  const goodsTypeForTracking = production.goods || initialGoods;
  // 2차 안내를 받을 이메일. 설문 완료 화면에서만 선택으로 받는다.
  const [noticeEmail, setNoticeEmail] = useState("");
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  const [noticeState, setNoticeState] = useState<"idle" | "saving" | "done">(
    "idle"
  );
  const [noticeError, setNoticeError] = useState("");
  const [apiBusy, setApiBusy] = useState(false);
  const [apiError, setApiError] = useState("");
  const [draftSaveState, setDraftSaveState] = useState<
    "idle" | "saving" | "saved" | "offline"
  >("idle");
  const [submissionProgress, setSubmissionProgress] = useState("");
  const [surveyRun, setSurveyRun] = useState(0);
  const surveyCompletionTracked = useRef(false);
  // 노션 6·8·9번: 단계별 진입/재방문/이탈을 세려면 어디까지 갔는지 들고 있어야 한다.
  const stepVisits = useRef(new StepVisitLog());
  const applicationTracked = useRef(false);
  const abandonTracked = useRef(false);
  const fileClientIds = useRef(new Map<string, string>());
  const idempotencyKey = useRef(createClientId());
  const draftSaveQueue = useRef(Promise.resolve());
  const navigationLocked = useRef(false);

  const visibleScreens = useMemo(() => getVisibleScreens(answers), [answers]);
  const currentIndex = Math.max(
    0,
    findScreenIndex(visibleScreens, currentQuestionId)
  );
  const currentScreen = visibleScreens[currentIndex] ?? visibleScreens[0];

  // 노션 STEP 1~15. 질문 13페이지가 1~13, 사연이 14, 굿즈 제작 정보가 15다.
  const currentStep =
    stage === "questions"
      ? surveyStepOf({ stage, page: currentScreen?.page ?? 0 })
      : surveyStepOf({ stage });

  const setAnswer = (questionId: string, value: string | string[]) =>
    setAnswers(previous => {
      const next = { ...previous };
      // 복수선택을 모두 해제하면 답하지 않은 것으로 되돌린다.
      // 빈 배열을 그대로 두면 "다음"이 열린 채로 저장이 거부된다.
      if (Array.isArray(value) && value.length === 0) delete next[questionId];
      else next[questionId] = value;
      return next;
    });

  const setFreeText = (questionId: string, value: string) =>
    setAnswers(previous => {
      const next = { ...previous };
      const key = freeTextKey(questionId);
      if (value.trim() === "") delete next[key];
      else next[key] = value.slice(0, FREE_TEXT_MAX_LENGTH);
      return next;
    });
  // 매트릭스 화면은 문항이 여럿이지만 진행·타이밍 기준은 첫 문항으로 잡는다.
  const currentQuestion = currentScreen?.questions[0];
  const answered = (question: SurveyQuestion) => {
    const value = answers[question.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  };
  // 선택 응답(optional)과 건너뛸 수 있는 문항은 "다음"을 막지 않는다.
  const hasAnswer =
    Boolean(currentScreen) &&
    currentScreen.questions
      .filter(question => !question.optional && !question.skippable)
      .every(answered);
  const terminatingAnswerSelected = isSurveyTerminated(answers);
  const progress = getSurveyProgress({
    currentIndex,
    visibleQuestionCount: visibleScreens.length,
    terminated: terminatingAnswerSelected,
  });
  const getQuestionActiveMs = useActiveTime(
    `${surveyRun}:${currentQuestion?.id ?? "none"}`,
    stage === "questions" && !apiBusy
  );
  const getSurveyActiveMs = useActiveTime(
    `survey:${surveyRun}`,
    stage === "questions" && !apiBusy
  );
  usePageEngagement("goods_survey_form");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "반려견 돌봄 경험 조사 | Pawever";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // 굿즈 상태는 화면 문구를 정하는 데 쓴다. 조회에 실패하면 닫힌 것으로 두고,
  // 실제 갈림길에서 한 번 더 확인한다.
  useEffect(() => {
    void getSurveyCampaign()
      .then(applyCampaign)
      .catch(() => {
        // 최종 판정은 서버가 한다. 여기서 실패해도 설문 진행은 막지 않는다.
      });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage, currentQuestionId]);

  useEffect(() => {
    if (stage !== "questions" || !currentQuestion) return;
    trackEvent("survey_question_view", {
      question_id: currentQuestion.id,
      question_section: currentQuestion.section,
      question_type: currentQuestion.kind,
    });
  }, [currentQuestion, stage]);

  useEffect(() => {
    if (stage !== "production") return;
    trackEvent("production_form_view", {
      goods_type: goodsTypeForTracking,
    });
  }, [stage]);

  // 회의록 13번의 member_offer_view. 설문을 마치고 참여자 가격을 실제로 본
  // 사람 수가 알림 신청 전환율의 분모다. 완료했다고 모두 이 화면을 보는 것은
  // 아니어서(굿즈가 열려 있으면 제작 화면으로 간다) survey_complete로는 셀 수 없다.
  useEffect(() => {
    if (stage !== "full") return;
    trackEvent("member_offer_view", { offer_placement: "survey_complete" });
  }, [stage]);

  // 노션 5번: 안내 화면 방문과 시작 버튼 클릭을 따로 봐야
  // 열어보기만 하고 시작하지 않은 사람을 구분할 수 있다.
  useEffect(() => {
    if (stage !== "intro") return;
    trackEvent("survey_intro_view", {
      goods_type: goodsTypeForTracking,
      resumed: Boolean(restoredDraft),
    });
  }, [stage]);

  // 노션 6번: 각 단계에 진입한 사용자 수.
  // enterOnce가 리렌더 중복은 막고, 안내 화면을 거쳐 돌아온 재진입은 다시 센다.
  useEffect(() => {
    const visitCount = stepVisits.current.enterOnce(currentStep);
    if (currentStep === null || visitCount === null) return;

    trackEvent("survey_step_view", {
      step_number: currentStep,
      step_name: surveyStepLabel(currentStep),
      step_visit_count: visitCount,
      question_count:
        stage === "questions" ? currentScreen?.questions.length : undefined,
      goods_type: goodsTypeForTracking,
    });
  }, [currentStep, surveyRun]);

  // 노션 9번: 브라우저 종료나 네트워크 단절은 확실히 잡을 수 없다.
  // 보고서는 "마지막 진입 STEP + 이후 이벤트 없음"으로 계산하되,
  // 떠나는 순간을 잡을 수 있으면 beacon으로 한 번 더 남긴다.
  useEffect(() => {
    const onPageHide = () => {
      const log = stepVisits.current;
      if (abandonTracked.current || applicationTracked.current) return;
      if (log.last === 0) return;
      abandonTracked.current = true;
      trackEvent("survey_abandon", {
        step_number: log.last,
        step_name: surveyStepLabel(log.last),
        furthest_step: log.furthest,
        survey_completed: surveyCompletionTracked.current,
        goods_type: goodsTypeForTracking,
      });
    };

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [goodsTypeForTracking]);

  // 화면 상태와 분석 국면을 함께 갱신한다. 한쪽만 바꾸면 이벤트에 옛 국면이 실린다.
  const applyCampaign = (next: SurveyCampaign) => {
    setCampaign(next);
    setSurveyPhaseContext({
      campaignId: next.campaignId,
      goodsOpen: next.goodsOpen,
    });
  };

  const apiMessage = (error: unknown) =>
    error instanceof GoodsSurveyApiError
      ? error.message
      : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";

  const persistSnapshot = (
    session: SurveyDraftSession,
    nextAnswers: SurveyAnswers,
    nextQuestionId: string,
    timings: Record<string, number>,
    nextStage: PersistedSurveyStage
  ) => {
    saveGoodsSurveyDraftSnapshot({
      questionnaireVersion: GOODS_SURVEY_VERSION,
      session,
      answers: nextAnswers,
      currentQuestionId: nextQuestionId,
      questionActiveMs: timings,
      surveyActiveMs: surveyActiveBaseMs + getSurveyActiveMs(),
      // 이어서 참여할 때 이 값으로 같은 응답인지 가린다. 제작 화면에서 고른 굿즈를
      // 넣으면 그 선택을 바꾸는 순간 임시 저장이 남남이 되어 복구되지 않는다.
      selectedGoods: initialGoods,
      stage: nextStage,
    });
  };

  const buildSavePayload = (
    nextAnswers: SurveyAnswers,
    nextQuestionId: string,
    timings: Record<string, number>
  ) => ({
    answers: nextAnswers,
    currentQuestionId: nextQuestionId,
    surveyActiveMs: surveyActiveBaseMs + getSurveyActiveMs(),
    questionActiveMs: timings,
    tracking: createSubmissionTrackingContext(),
  });

  const queueDraftSave = (
    session: SurveyDraftSession,
    nextAnswers: SurveyAnswers,
    nextQuestionId: string,
    timings: Record<string, number>
  ) => {
    // 저장 요청은 어느 경로로 들어오든 서버가 받는 형태여야 한다.
    // 특히 복수선택을 모두 해제하면 빈 배열이 남는데 서버는 이를 거부하므로,
    // 호출부에 맡기지 않고 여기서 한 번 더 정리한다.
    const payload = buildSavePayload(
      pruneHiddenAnswers(nextAnswers),
      nextQuestionId,
      timings
    );
    setDraftSaveState("saving");
    draftSaveQueue.current = draftSaveQueue.current
      .catch(() => undefined)
      .then(() => saveSurveyDraft(session, payload))
      .then(() => {
        setDraftSaveState("saved");
      })
      .catch(error => {
        setDraftSaveState("offline");
        setApiError(
          `${apiMessage(error)} 입력 내용은 이 브라우저에 임시 보관했습니다.`
        );
      });
  };

  const captureCurrentQuestionTiming = () => {
    if (!currentQuestion) return questionActiveMs;
    const nextTimings = {
      ...questionActiveMs,
      [currentQuestion.id]:
        (questionActiveMs[currentQuestion.id] ?? 0) + getQuestionActiveMs(),
    };
    setQuestionActiveMs(nextTimings);
    return nextTimings;
  };

  const startSurvey = async () => {
    if (apiBusy) return;
    setApiBusy(true);
    setApiError("");
    try {
      const wasResume = Boolean(draftSession);
      let session = draftSession;
      if (!session) {
        clearGoodsSurveyDraftSnapshot();
        session = await createSurveyDraft({
          questionnaireVersion: GOODS_SURVEY_VERSION,
          selectedGoods: initialGoods,
          tracking: createSubmissionTrackingContext(),
        });
        setDraftSession(session);
        setRemaining(session.remaining);
        persistSnapshot(session, {}, "q1", {}, "questions");
      }

      trackEvent("survey_start", {
        entry_method: wasResume ? "resume_button" : "intro_button",
        goods_type: goodsTypeForTracking,
      });

      if (
        session.status === "RESERVED" ||
        session.status === "COMPLETED_NO_SLOT"
      ) {
        // 설문을 끝낸 사람이다. 굿즈 자리를 받았는지는 여기서 따지지 않는다.
        // 자리가 없어도 사연은 남길 수 있고, 굿즈 여부는 제작 화면으로 넘어가는
        // 갈림길에서 한 번만 판단한다. 그래야 다 채운 뒤 거절당하는 일도 없고,
        // 사연을 쓰러 온 사람이 문 앞에서 막히지도 않는다.
        const latest = await getSurveyCampaign().catch(() => null);
        if (latest) {
          applyCampaign(latest);
          setRemaining(latest.remaining);
        }
        const resumedStage =
          restoredDraft?.stage && restoredDraft.stage !== "questions"
            ? restoredDraft.stage
            : "closing";
        // 제작 정보를 적다 나간 사이에 굿즈가 닫혔다면 그 화면으로 되돌리지 않는다.
        setStage(
          resumedStage === "production" && !(latest?.goodsOpen ?? false)
            ? "closing"
            : resumedStage
        );
      } else if (session.status === "TERMINATED") {
        setStage("terminated");
      } else {
        setStage("questions");
      }
    } catch (error) {
      setApiError(apiMessage(error));
    } finally {
      setApiBusy(false);
    }
  };

  const completeCurrentSurvey = async (
    session: SurveyDraftSession,
    nextAnswers: SurveyAnswers,
    timings: Record<string, number>
  ) => {
    setApiBusy(true);
    setApiError("");
    try {
      await draftSaveQueue.current.catch(() => undefined);
      const tracking = createSubmissionTrackingContext();
      const completion = await completeSurveyRequest(session, {
        answers: nextAnswers,
        currentQuestionId,
        surveyActiveMs: surveyActiveBaseMs + getSurveyActiveMs(),
        questionActiveMs: timings,
        tracking,
      });
      const completedSession = {
        ...session,
        status: completion.status,
        remaining: completion.remaining,
        reservationExpiresAt: completion.reservationExpiresAt,
      };
      setDraftSession(completedSession);
      setRemaining(completion.remaining);

      if (completion.status === "TERMINATED") {
        clearGoodsSurveyDraftSnapshot();
        setStage("terminated");
        return;
      }

      if (!surveyCompletionTracked.current) {
        surveyCompletionTracked.current = true;
        trackEvent(
          "survey_complete",
          {
            answered_question_count: Object.keys(nextAnswers).length,
            active_ms: surveyActiveBaseMs + getSurveyActiveMs(),
            // 굿즈가 닫혀 있으면 늘 COMPLETED_NO_SLOT이다. 예전처럼 참·거짓으로만
            // 두면 보고서에 "예약률 0%"로 보여 원인을 오해한다.
            completion_status: completion.status,
          },
          { eventId: tracking.conversionEventId }
        );
      }

      // COMPLETED_NO_SLOT은 굿즈 자리를 못 받았다는 뜻일 뿐, 설문은 끝난 것이다.
      // 사연은 자리와 상관없이 남길 수 있으므로 여기서 흐름을 끊지 않는다.
      // 굿즈 여부는 제작 화면으로 넘어가는 갈림길에서 한 번만 판단한다.
      persistSnapshot(
        completedSession,
        nextAnswers,
        currentQuestionId,
        timings,
        "closing"
      );
      setStage("closing");
    } catch (error) {
      setApiError(apiMessage(error));
    } finally {
      setApiBusy(false);
    }
  };

  const moveAfterAnswer = async (
    nextAnswers: SurveyAnswers,
    timings: Record<string, number>
  ) => {
    if (!draftSession) {
      setApiError(
        "설문 연결 정보가 없습니다. 처음 화면에서 다시 시작해 주세요."
      );
      return;
    }

    const prunedAnswers = pruneHiddenAnswers(nextAnswers);
    setAnswers(prunedAnswers);
    const nextScreens = getVisibleScreens(prunedAnswers);
    const index = findScreenIndex(nextScreens, currentQuestionId);
    const nextQuestion = nextScreens[index + 1];
    if (!isSurveyTerminated(prunedAnswers) && nextQuestion) {
      setCurrentQuestionId(nextQuestion.id);
      persistSnapshot(
        draftSession,
        prunedAnswers,
        nextQuestion.id,
        timings,
        "questions"
      );
      queueDraftSave(draftSession, prunedAnswers, nextQuestion.id, timings);
      return;
    }

    if (
      !isSurveyTerminated(prunedAnswers) &&
      !hasMinimumAnswers(prunedAnswers)
    ) {
      setApiError(
        "응답이 너무 적어 설문을 마칠 수 없어요. 이전으로 돌아가 몇 문항만 더 답해 주세요."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    await completeCurrentSurvey(draftSession, prunedAnswers, timings);
  };

  const goNext = async () => {
    if (!currentQuestion || navigationLocked.current) return;
    navigationLocked.current = true;
    const activeMs = getQuestionActiveMs();
    const timings = captureCurrentQuestionTiming();
    trackEvent("survey_question_answered", {
      question_id: currentQuestion.id,
      question_section: currentQuestion.section,
      question_type: currentQuestion.kind,
      active_ms: activeMs,
      skipped: false,
    });
    // 노션 6·7번: 이 화면(STEP)을 끝내고 다음으로 넘어간 기록.
    // navigationLocked가 "다음" 연속 클릭을 막으므로 두 번 세지 않는다.
    if (currentStep !== null) {
      trackEvent("survey_step_complete", {
        step_number: currentStep,
        step_name: surveyStepLabel(currentStep),
        active_ms: activeMs,
        question_count: currentScreen?.questions.length,
        step_visit_count: stepVisits.current.visitCount(currentStep),
        goods_type: goodsTypeForTracking,
      });
    }
    try {
      await moveAfterAnswer(answers, timings);
    } finally {
      navigationLocked.current = false;
    }
  };

  const skipQuestion = async () => {
    if (!currentQuestion || navigationLocked.current) return;
    navigationLocked.current = true;
    const nextAnswers = { ...answers };
    delete nextAnswers[currentQuestion.id];
    const activeMs = getQuestionActiveMs();
    const timings = captureCurrentQuestionTiming();
    trackEvent("survey_question_answered", {
      question_id: currentQuestion.id,
      question_section: currentQuestion.section,
      question_type: currentQuestion.kind,
      active_ms: activeMs,
      skipped: true,
    });
    setAnswers(nextAnswers);
    try {
      await moveAfterAnswer(nextAnswers, timings);
    } finally {
      navigationLocked.current = false;
    }
  };

  const goBack = () => {
    // 노션 8번: 어느 단계에서 어느 단계로 돌아갔고 그 단계에 얼마나 머물렀는지.
    // to_step 0은 노션 STEP에 없는 화면(closing·intro)으로 돌아갔다는 뜻이다.
    const trackBack = (toStep: number) => {
      if (currentStep === null) return;
      trackEvent("survey_step_back", {
        step_number: currentStep,
        step_name: surveyStepLabel(currentStep),
        to_step: toStep,
        active_ms: stage === "questions" ? getQuestionActiveMs() : undefined,
        step_visit_count: stepVisits.current.visitCount(currentStep),
        goods_type: goodsTypeForTracking,
      });
    };

    if (stage === "story") {
      trackBack(0);
      if (draftSession) {
        persistSnapshot(
          draftSession,
          answers,
          currentQuestionId,
          questionActiveMs,
          "closing"
        );
      }
      setStage("closing");
      return;
    }
    if (stage === "production") {
      const previousStage = story.scene.trim() ? "story" : "closing";
      trackBack(previousStage === "story" ? 14 : 0);
      if (draftSession) {
        persistSnapshot(
          draftSession,
          answers,
          currentQuestionId,
          questionActiveMs,
          previousStage
        );
      }
      setStage(previousStage);
      return;
    }
    if (stage !== "questions") {
      setLocation("/goods-survey");
      return;
    }

    const timings = captureCurrentQuestionTiming();
    const previousQuestion = visibleScreens[currentIndex - 1];
    trackBack(previousQuestion?.page ?? 0);
    if (previousQuestion) {
      setCurrentQuestionId(previousQuestion.id);
      if (draftSession) {
        persistSnapshot(
          draftSession,
          answers,
          previousQuestion.id,
          timings,
          "questions"
        );
        queueDraftSave(draftSession, answers, previousQuestion.id, timings);
      }
    } else {
      setStage("intro");
    }
  };

  const updateStory = (field: keyof StoryFields, value: string) =>
    setStory(previous => ({ ...previous, [field]: value }));

  const removePhoto = (index: number) => {
    setPhotos(previous => previous.filter((_, position) => position !== index));
    setApiError("");
    // 같은 파일을 다시 고를 수 있도록 input 값을 비운다.
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  // 첨부한 사진을 그대로 보여준다. 미리보기 URL은 사진이 바뀌면 바로 회수한다.
  useEffect(() => {
    const urls = photos.map(file => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [photos]);

  // 사연 페이지의 조건부 섹션은 T1이 아니라 Q1로 판단한다.
  // T1은 단일선택이라 "지금도 함께 살고 이별 경험도 있다"를 표현하지 못한다.
  const livesWithPet =
    answers.q1 === "current_only" || answers.q1 === "current_and_loss";
  const hasLostPet =
    answers.q1 === "current_and_loss" || answers.q1 === "loss_only";

  const storyReady =
    Boolean(
      story.status && story.age && story.condition && story.scene.trim()
    ) && storyConsent.analysis;

  const phoneInvalid =
    production.phone.trim().length > 0 &&
    !PHONE_PATTERN.test(production.phone.trim());

  const productionReady =
    photos.length > 0 &&
    Boolean(
      production.goods &&
        production.petName.trim() &&
        production.guardianName.trim() &&
        PHONE_PATTERN.test(production.phone.trim()) &&
        production.postalCode.trim() &&
        production.address.trim()
    ) &&
    (production.goods !== "custom" || Boolean(production.customGoods.trim())) &&
    privacyConsent &&
    shippingConsent;

  /**
   * 설문·사연을 마친 뒤 어디로 갈지 정하는 갈림길.
   *
   * 굿즈가 열려 있으면 제작 정보를 받고, 닫혀 있으면 여기서 끝낸다.
   * 이 판단을 화면 진입 시점이 아니라 여기 한 곳에 둔 이유는, 굿즈를 못 받는
   * 사람도 사연까지는 남길 수 있어야 하고, 반대로 제작 정보를 다 채운 뒤에
   * 거절당하는 일도 없어야 하기 때문이다.
   */
  const continueAfterStory = async () => {
    // 사연 화면(STEP 14)을 거쳐 온 경우에만 그 단계를 끝낸 것으로 센다.
    // closing에서 바로 넘어온 사람은 STEP 14에 들어간 적이 없다.
    if (currentStep !== null) {
      trackEvent("survey_step_complete", {
        step_number: currentStep,
        step_name: surveyStepLabel(currentStep),
        story_written: Boolean(story.scene.trim()),
        goods_type: goodsTypeForTracking,
      });
    }

    // 설문을 채우는 동안 굿즈가 닫혔을 수 있다. 화면에 들고 있던 값 대신
    // 지금 상태를 다시 확인한다. 조회에 실패하면 마지막으로 받은 값을 쓴다.
    const latest = await getSurveyCampaign().catch(() => campaign);
    if (latest) {
      applyCampaign(latest);
      setRemaining(latest.remaining);
    }

    if (!(latest?.goodsOpen ?? false)) {
      setStage("full");
      return;
    }

    if (draftSession) {
      persistSnapshot(
        draftSession,
        answers,
        currentQuestionId,
        questionActiveMs,
        "production"
      );
    }
    setStage("production");
  };

  const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
  const noticeReady =
    noticeAgreed &&
    EMAIL_PATTERN.test(noticeEmail.trim()) &&
    noticeState === "idle";

  const submitNoticeEmail = async () => {
    if (!draftSession || !noticeReady) return;
    setNoticeState("saving");
    setNoticeError("");
    try {
      await subscribeSurveyNotice(draftSession, noticeEmail.trim());
      trackEvent("notice_subscribe");
      setNoticeState("done");
    } catch (error) {
      setNoticeState("idle");
      setNoticeError(apiMessage(error));
    }
  };

  // 사연을 저장하지 않고 바로 넘어가는 버튼용. 캠페인을 다시 조회하는 동안
  // 버튼이 반응 없어 보이지 않도록 진행 표시를 켠다.
  const skipStoryAndContinue = () => {
    if (apiBusy) return;
    setApiBusy(true);
    void continueAfterStory().finally(() => setApiBusy(false));
  };

  const saveStoryAndContinue = async () => {
    if (!draftSession || !storyReady || apiBusy) return;
    setApiBusy(true);
    setApiError("");
    try {
      await saveSurveyStory(draftSession, {
        ...story,
        analysisAgreed: storyConsent.analysis === true,
        publishAgreed: storyConsent.publish === true,
      });
      await continueAfterStory();
    } catch (error) {
      setApiError(apiMessage(error));
    } finally {
      setApiBusy(false);
    }
  };

  const finishReview = async () => {
    if (!draftSession || !productionReady || apiBusy) return;
    setApiBusy(true);
    setApiError("");
    try {
      setSubmissionProgress("사진을 안전하게 업로드하고 있어요.");
      const photoIds = await Promise.all(
        photos.map(file => {
          const key = getFileKey(file);
          let clientFileId = fileClientIds.current.get(key);
          if (!clientFileId) {
            clientFileId = createClientId();
            fileClientIds.current.set(key, clientFileId);
          }
          return uploadSurveyPhoto(draftSession, file, clientFileId);
        })
      );
      // 사진별 공개 동의를 따로 받지 않고, 사연의 SNS 공유 동의 하나로 일괄 처리한다.
      const publicPhotoIds = storyConsent.publish === true ? photoIds : [];

      setSubmissionProgress(
        "신청 정보를 저장하고 선착순 자리를 확정하고 있어요."
      );
      const tracking = createSubmissionTrackingContext();
      const application = await submitSurveyApplication(
        draftSession,
        idempotencyKey.current,
        {
          goodsType: production.goods,
          customGoods: production.customGoods,
          petName: production.petName,
          guardianName: production.guardianName,
          phone: production.phone,
          postalCode: production.postalCode,
          address: production.address,
          addressDetail: production.addressDetail,
          photoIds,
          publicPhotoIds,
          conversionEventId: tracking.conversionEventId,
          tracking,
          privacyAgreed: privacyConsent,
          shippingConfirmed: shippingConsent,
        }
      );
      const nextReviewId = `PAW-${application.responseId
        .slice(0, 8)
        .toUpperCase()}`;
      setReviewId(nextReviewId);
      setRemaining(application.remaining);
      // 노션 10번: 제출 버튼을 누른 시점이 아니라 서버 저장이 끝난 지금이 완료다.
      // 여기까지 온 사람은 이탈이 아니므로 pagehide 이탈 기록도 막는다.
      if (!applicationTracked.current) {
        applicationTracked.current = true;
        if (currentStep !== null) {
          trackEvent("survey_step_complete", {
            step_number: currentStep,
            step_name: surveyStepLabel(currentStep),
            goods_type: goodsTypeForTracking,
          });
        }
        trackEvent(
          "application_complete",
          {
            goods_type: goodsTypeForTracking,
            photo_count: photos.length,
            story_included: Boolean(story.scene.trim()),
            furthest_step: stepVisits.current.furthest,
          },
          { eventId: tracking.conversionEventId }
        );
      }
      clearGoodsSurveyDraftSnapshot();
      setStage("complete");
    } catch (error) {
      setApiError(apiMessage(error));
    } finally {
      setSubmissionProgress("");
      setApiBusy(false);
    }
  };

  const resetSurvey = () => {
    clearGoodsSurveyDraftSnapshot();
    setAnswers({});
    setCurrentQuestionId("q1");
    setDraftSession(null);
    setQuestionActiveMs({});
    setSurveyActiveBaseMs(0);
    setStory(emptyStory);
    setStoryConsent({
      analysis: null,
      publish: null,
    });
    setPhotos([]);
    setPrivacyConsent(false);
    setShippingConsent(false);
    setReviewId("");
    setApiError("");
    setDraftSaveState("idle");
    fileClientIds.current.clear();
    idempotencyKey.current = createClientId();
    setSurveyRun(previous => previous + 1);
    surveyCompletionTracked.current = false;
    // 새 응답은 새 세션이다. 단계 기록과 전환 표시를 비우지 않으면
    // 두 번째 신청이 전환으로 세지 않고, 단계 방문 횟수도 앞 응답 것이 이어진다.
    stepVisits.current.reset();
    applicationTracked.current = false;
    abandonTracked.current = false;
    setStage("intro");
  };

  return (
    <main className="goods-survey-form-page">
      <div className="gsf-shell">
        <header className="gsf-header">
          <button
            type="button"
            className="gsf-icon-button"
            onClick={
              stage === "intro" ? () => setLocation("/goods-survey") : goBack
            }
            aria-label={stage === "intro" ? "랜딩페이지로 돌아가기" : "이전"}
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <a
            href="/goods-survey"
            onClick={event => {
              event.preventDefault();
              setLocation("/goods-survey");
            }}
            className="gsf-brand"
          >
            <PawPrint aria-hidden="true" />
            <span>Pawever</span>
          </a>
          <span className="gsf-header-time">약 15분</span>
        </header>

        {stage === "questions" && (
          <div
            className="gsf-progress"
            aria-label={
              terminatingAnswerSelected
                ? "설문 대상 확인 단계"
                : `설문 진행률 ${progress.value}%`
            }
          >
            <div>
              <span style={{ width: `${progress.value}%` }} />
            </div>
            <p>
              <strong>{progress.label}</strong>
              <span>
                {progress.detail}
                {draftSaveState === "saving" && " · 저장 중"}
                {draftSaveState === "saved" && " · 저장됨"}
                {draftSaveState === "offline" && " · 재연결 필요"}
              </span>
            </p>
          </div>
        )}

        {apiError && (
          <div className="gsf-api-error" role="alert">
            <span>{apiError}</span>
            <button
              type="button"
              onClick={() => setApiError("")}
              aria-label="오류 안내 닫기"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="gsf-content">
          {stage === "intro" && (
            <section className="gsf-intro">
              <h1>{goodsSurveyIntroContent.title}</h1>
              <div className="gsf-intro-copy">
                <p>
                  <EmphasizedCopy
                    text={goodsSurveyIntroContent.introduction[0]}
                    emphasis="오늘을 더 잘 기억하는 서비스"
                  />
                </p>
                <p>{goodsSurveyIntroContent.introduction[1]}</p>
                <p>{goodsSurveyIntroContent.introduction[2]}</p>
              </div>
              <div className="gsf-intro-card">
                <Sparkles aria-hidden="true" />
                <div>
                  <p>{goodsSurveyIntroContent.introduction[3]}</p>
                  <p>
                    <EmphasizedCopy
                      text={goodsSurveyIntroContent.introduction[4]}
                      emphasis="건너뛰어도 괜찮습니다 :)"
                    />
                  </p>
                </div>
              </div>
              <div className="gsf-intro-meta">
                <span>{goodsSurveyIntroContent.expectedTime}</span>
                <span>{goodsSurveyIntroContent.audience}</span>
              </div>
              <div className="gsf-baseline">
                <p>
                  <EmphasizedCopy
                    text={goodsSurveyIntroContent.responseCriteria[0]}
                    emphasis="현재 가장 많이 돌보고 있는 아이 한 마리"
                  />
                </p>
                <p>
                  <EmphasizedCopy
                    text={goodsSurveyIntroContent.responseCriteria[1]}
                    emphasis="가장 최근에 이별한 아이 한 마리"
                  />
                </p>
                <p>{goodsSurveyIntroContent.responseCriteria[2]}</p>
              </div>
              <button
                type="button"
                className="gsf-primary"
                onClick={startSurvey}
                disabled={apiBusy}
              >
                {apiBusy
                  ? "설문을 준비하고 있어요..."
                  : draftSession
                    ? "이어서 참여하기"
                    : "설문 시작하기"}
                <ArrowRight aria-hidden="true" />
              </button>
            </section>
          )}

          {stage === "questions" && currentScreen && (
            <div className="gsf-page">
              {getScreenBlocks(currentScreen).map(block =>
                block.kind === "matrix" ? (
                  <MatrixScreen
                    key={block.questions[0].id}
                    questions={block.questions}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                ) : (
                  <QuestionScreen
                    key={block.question.id}
                    question={block.question}
                    answers={answers}
                    onAnswer={value => setAnswer(block.question.id, value)}
                    onFreeText={value => setFreeText(block.question.id, value)}
                  />
                )
              )}
            </div>
          )}

          {stage === "terminated" && (
            <section className="gsf-message">
              <span className="gsf-message-icon">
                <Heart aria-hidden="true" />
              </span>
              <h1>
                {answers.q1 === "prefer_not"
                  ? "선택을 존중합니다."
                  : "응답해 주셔서 감사합니다."}
              </h1>
              <p>
                {answers.q1 === "prefer_not"
                  ? "답하고 싶지 않다는 선택에 따라 설문을 여기에서 마무리합니다."
                  : "이번 조사는 반려견을 직접 돌본 경험이 있는 분을 대상으로 진행하고 있어 여기에서 마무리됩니다."}
              </p>
              <button
                type="button"
                className="gsf-primary"
                onClick={resetSurvey}
              >
                처음으로 돌아가기
              </button>
              <button
                type="button"
                className="gsf-text-button"
                onClick={() => setLocation("/goods-survey")}
              >
                랜딩페이지 보기
              </button>
            </section>
          )}

          {stage === "closing" && (
            <section className="gsf-message gsf-closing">
              <span className="gsf-message-icon">
                <PawPrint aria-hidden="true" />
              </span>
              <span className="gsf-eyebrow">설문 응답 완료</span>
              <h1>{goodsSurveyClosingContent.title}</h1>
              {goodsSurveyClosingContent.paragraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="gsf-choice-card">
                <strong>{goodsSurveyClosingContent.storyTitle}</strong>
                <p>{goodsSurveyClosingContent.storyDescription}</p>
                <button
                  type="button"
                  className="gsf-primary"
                  onClick={() => {
                    trackEvent("story_start");
                    if (draftSession) {
                      persistSnapshot(
                        draftSession,
                        answers,
                        currentQuestionId,
                        questionActiveMs,
                        "story"
                      );
                    }
                    setStage("story");
                  }}
                >
                  {goodsSurveyClosingContent.storyButton}
                  <ArrowRight aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="gsf-secondary"
                  disabled={apiBusy}
                  onClick={() => {
                    trackEvent("story_skip", {
                      skip_placement: "closing",
                    });
                    skipStoryAndContinue();
                  }}
                >
                  {goodsSurveyClosingContent.skipButton}
                </button>
              </div>
            </section>
          )}

          {stage === "story" && (
            <form
              className="gsf-long-form"
              onSubmit={event => {
                event.preventDefault();
                if (storyReady) void saveStoryAndContinue();
              }}
            >
              <span className="gsf-eyebrow">선택 작성</span>
              <h1>{goodsSurveyStoryContent.title}</h1>
              <div className="gsf-form-lead">
                {goodsSurveyStoryContent.introduction.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <h2 className="gsf-story-section-title">
                {goodsSurveyStoryContent.sections.basicInfo}
              </h2>
              <div className="gsf-form-card">
                <label>
                  <FieldLabel>
                    {goodsSurveyStoryContent.fields.status}
                  </FieldLabel>
                  <select
                    value={story.status}
                    onChange={event =>
                      updateStory("status", event.target.value)
                    }
                  >
                    <option value="">선택해 주세요</option>
                    {storySelects.status.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>{goodsSurveyStoryContent.fields.age}</FieldLabel>
                  <select
                    value={story.age}
                    onChange={event => updateStory("age", event.target.value)}
                  >
                    <option value="">선택해 주세요</option>
                    {storySelects.age.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>
                    {goodsSurveyStoryContent.fields.condition}
                  </FieldLabel>
                  <select
                    value={story.condition}
                    onChange={event =>
                      updateStory("condition", event.target.value)
                    }
                  >
                    <option value="">선택해 주세요</option>
                    {storySelects.condition.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <h2 className="gsf-story-section-title">
                {goodsSurveyStoryContent.sections.commonStories}
              </h2>
              <StoryTextarea
                {...goodsSurveyStoryContent.fields.scene}
                value={story.scene}
                onChange={value => updateStory("scene", value)}
                optional={false}
              />
              <StoryTextarea
                {...goodsSurveyStoryContent.fields.changedDay}
                value={story.changedDay}
                onChange={value => updateStory("changedDay", value)}
              />
              <StoryTextarea
                {...goodsSurveyStoryContent.fields.startedNow}
                value={story.startedNow}
                onChange={value => updateStory("startedNow", value)}
              />
              <StoryTextarea
                {...goodsSurveyStoryContent.fields.unsaidSearch}
                value={story.unsaidSearch}
                onChange={value => updateStory("unsaidSearch", value)}
              />
              <StoryTextarea
                {...goodsSurveyStoryContent.fields.neededHelp}
                value={story.neededHelp}
                onChange={value => updateStory("neededHelp", value)}
              />

              {livesWithPet && (
                <>
                  <h2 className="gsf-story-section-title">
                    {goodsSurveyStoryContent.sections.currentGuardian}
                  </h2>
                  <StoryTextarea
                    {...goodsSurveyStoryContent.fields.postponed}
                    value={story.postponed}
                    onChange={value => updateStory("postponed", value)}
                  />
                </>
              )}

              {hasLostPet && (
                <>
                  <h2 className="gsf-story-section-title">
                    {goodsSurveyStoryContent.sections.departedGuardian}
                  </h2>
                  <StoryTextarea
                    {...goodsSurveyStoryContent.fields.wishKnownEarlier}
                    value={story.wishKnownEarlier}
                    onChange={value => updateStory("wishKnownEarlier", value)}
                  />
                  <StoryTextarea
                    {...goodsSurveyStoryContent.fields.finalHelp}
                    value={story.finalHelp}
                    onChange={value => updateStory("finalHelp", value)}
                  />
                </>
              )}

              <h2 className="gsf-story-section-title">
                {goodsSurveyStoryContent.sections.closing}
              </h2>
              <StoryTextarea
                {...goodsSurveyStoryContent.fields.oneLine}
                value={story.oneLine}
                onChange={value => updateStory("oneLine", value)}
              />

              <div className="gsf-consent-card">
                <strong>{goodsSurveyStoryContent.sections.consents}</strong>
                <ConsentChoice
                  name="story-analysis-consent"
                  label={goodsSurveyStoryContent.consents.analysis}
                  value={storyConsent.analysis}
                  required
                  onChange={value =>
                    setStoryConsent(previous => ({
                      ...previous,
                      analysis: value,
                    }))
                  }
                />
                <ConsentChoice
                  name="story-publish-consent"
                  label={goodsSurveyStoryContent.consents.publish}
                  value={storyConsent.publish}
                  onChange={value =>
                    setStoryConsent(previous => ({
                      ...previous,
                      publish: value,
                    }))
                  }
                />
                <p>{goodsSurveyStoryContent.consents.note}</p>
              </div>

              <button
                type="submit"
                className="gsf-primary"
                disabled={!storyReady || apiBusy}
              >
                {apiBusy
                  ? "사연을 저장하고 있어요..."
                  : goodsAvailable
                    ? "사연 저장하고 굿즈 신청하기"
                    : "사연 저장하고 마치기"}
                <ArrowRight aria-hidden="true" />
              </button>
              <button
                type="button"
                className="gsf-text-button"
                disabled={apiBusy}
                onClick={() => {
                  trackEvent("story_skip", {
                    skip_placement: "story_form",
                  });
                  skipStoryAndContinue();
                }}
              >
                사연을 작성하지 않고 넘어가기
              </button>
            </form>
          )}

          {stage === "production" && (
            <form
              className="gsf-long-form"
              onSubmit={event => {
                event.preventDefault();
                if (productionReady) void finishReview();
              }}
            >
              <span className="gsf-eyebrow">마지막 단계</span>
              <h1>{goodsSurveyProductionContent.title}</h1>
              <p className="gsf-form-lead">
                {goodsSurveyProductionContent.lead}
              </p>

              <section className="gsf-form-section">
                <h2>1. 받고 싶은 굿즈</h2>
                <div className="gsf-goods-grid">
                  {productionGoods.map(([id, name]) => (
                    <button
                      type="button"
                      key={id}
                      className={production.goods === id ? "is-selected" : ""}
                      onClick={() =>
                        setProduction(previous => ({
                          ...previous,
                          goods: id,
                        }))
                      }
                    >
                      <span>
                        {production.goods === id && (
                          <Check aria-hidden="true" />
                        )}
                      </span>
                      {name}
                    </button>
                  ))}
                </div>
                {production.goods === "custom" && (
                  <label>
                    <FieldLabel>원하는 형태</FieldLabel>
                    <input
                      value={production.customGoods}
                      onChange={event =>
                        setProduction(previous => ({
                          ...previous,
                          customGoods: event.target.value,
                        }))
                      }
                      placeholder="원하는 굿즈 형태와 용도를 적어 주세요."
                    />
                  </label>
                )}
                <p className="gsf-field-help">
                  {goodsSurveyProductionContent.goodsSubstitution}
                </p>
              </section>

              <section className="gsf-form-section">
                <h2>2. 반려견 사진</h2>
                <label className="gsf-upload">
                  <Upload aria-hidden="true" />
                  <strong>사진 선택하기</strong>
                  <span>JPG·PNG·WEBP, 장당 10MB 이하·최대 5장</span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={event => {
                      const nextFiles = Array.from(
                        event.target.files ?? []
                      ).slice(0, 5);
                      const invalidFile = nextFiles.find(
                        file =>
                          !["image/jpeg", "image/png", "image/webp"].includes(
                            file.type
                          ) || file.size > 10 * 1024 * 1024
                      );
                      if (invalidFile) {
                        setPhotos([]);
                        setApiError(
                          "사진은 JPG·PNG·WEBP 형식, 장당 10MB 이하만 올릴 수 있어요."
                        );
                        event.target.value = "";
                        return;
                      }
                      setApiError("");
                      setPhotos(nextFiles);
                    }}
                  />
                </label>
                {photos.length > 0 && (
                  <ul className="gsf-photo-preview">
                    {photos.map((file, index) => (
                      <li key={getFileKey(file)}>
                        <div className="gsf-photo-thumb">
                          {photoPreviews[index] && (
                            <img src={photoPreviews[index]} alt="" />
                          )}
                          <button
                            type="button"
                            className="gsf-photo-remove"
                            onClick={() => removePhoto(index)}
                            aria-label={`${file.name} 첨부 취소`}
                          >
                            <X aria-hidden="true" />
                          </button>
                        </div>
                        <span className="gsf-file-name">
                          <Check aria-hidden="true" />
                          {file.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="gsf-field-help">
                  밝은 곳에서 얼굴 정면과 귀가 가리지 않은 사진이 좋아요. 전신
                  피규어는 몸의 무늬와 자세가 보이는 사진도 함께 올려주세요.
                </p>
              </section>

              <section className="gsf-form-section">
                <h2>3. 제작·배송 정보</h2>
                {[
                  ["petName", "아이 이름", "반려견 이름"],
                  ["guardianName", "보호자 이름", "받는 분 이름"],
                  ["phone", "연락처", "010-0000-0000"],
                  ["postalCode", "우편번호", "우편번호"],
                  ["address", "배송지", "도로명 주소"],
                  ["addressDetail", "상세 주소", "동·호수 등 상세 주소"],
                ].map(([field, label, placeholder]) => (
                  <label key={field}>
                    <FieldLabel optional={field === "addressDetail"}>
                      {label}
                    </FieldLabel>
                    <input
                      value={production[field as keyof ProductionFields]}
                      onChange={event =>
                        setProduction(previous => ({
                          ...previous,
                          [field]: event.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      inputMode={field === "phone" ? "tel" : "text"}
                      aria-invalid={field === "phone" && phoneInvalid}
                    />
                    {field === "phone" && phoneInvalid && (
                      <span className="gsf-field-error" role="alert">
                        {goodsSurveyProductionContent.phoneFormatError}
                      </span>
                    )}
                  </label>
                ))}
              </section>

              <section className="gsf-form-section gsf-safety-summary">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <h2>제품 안전 안내</h2>
                  <p>{goodsSurveyProductionContent.safety}</p>
                </div>
              </section>

              <div className="gsf-consent-card">
                <strong>신청 전 확인</strong>
                <label>
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={event => setPrivacyConsent(event.target.checked)}
                  />
                  <span>
                    개인정보 수집·이용에 동의합니다. <em>필수</em>
                  </span>
                </label>
                <button
                  type="button"
                  className="gsf-inline-link"
                  onClick={() => setPrivacyOpen(true)}
                >
                  수집·이용 내용 자세히 보기
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={shippingConsent}
                    onChange={event => setShippingConsent(event.target.checked)}
                  />
                  <span>
                    제작비는 0원이며 배송비 3,000원이 별도임을 확인했습니다.{" "}
                    <em>필수</em>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="gsf-primary"
                disabled={!productionReady || apiBusy}
              >
                {apiBusy
                  ? "신청을 안전하게 저장하고 있어요..."
                  : "신청 완료하기"}
                <ArrowRight aria-hidden="true" />
              </button>
              {submissionProgress && (
                <p className="gsf-review-submit-note" role="status">
                  {submissionProgress}
                </p>
              )}
              {/* 화면 맨 위 안내는 긴 양식 끝에 있는 사람에게 보이지 않는다.
                  제출이 실패하면 진행 문구만 사라져서 아무 일도 안 일어난 것처럼 보인다. */}
              {apiError && !apiBusy && (
                <p className="gsf-field-error" role="alert">
                  {apiError}
                </p>
              )}
            </form>
          )}

          {/* 굿즈를 못 받는 사람에게도 이 화면은 실패가 아니라 완료다.
              설문을 끝까지 마친 것이 이 단계의 목적이므로 사과문을 두지 않는다. */}
          {stage === "full" && (
            <section className="gsf-message gsf-complete">
              <span className="gsf-message-icon">
                <Heart aria-hidden="true" />
              </span>
              <span className="gsf-eyebrow">설문 참여 완료</span>
              {/* 회의록 9번의 완료 화면 문구를 그대로 쓴다. */}
              <h1>설문을 모두 마쳤어요. 감사합니다.</h1>
              <div className="gsf-choice-card">
                <strong>
                  2차 맞춤 3D 피규어를 설문 참여자 가격{" "}
                  {wonText(GOODS_PRICE.member)}에 구매할 수 있어요.
                </strong>
                <p>
                  2차 오픈 소식을 신청한 채널로 보내드릴게요. 알림에 동의하지
                  않아도 참여자 가격은 그대로 유지됩니다.
                </p>
                {noticeState === "done" ? (
                  <p className="gsf-review-submit-note" role="status">
                    안내받을 주소를 저장했어요. 2차가 확정되면 알려드릴게요.
                  </p>
                ) : (
                  <div className="gsf-notice-form">
                    <label>
                      <FieldLabel optional>안내받을 이메일</FieldLabel>
                      <input
                        type="email"
                        inputMode="email"
                        value={noticeEmail}
                        onChange={event => setNoticeEmail(event.target.value)}
                        placeholder="이메일 주소"
                        autoComplete="email"
                      />
                    </label>
                    <label className="gsf-consent-inline">
                      <input
                        type="checkbox"
                        checked={noticeAgreed}
                        onChange={event =>
                          setNoticeAgreed(event.target.checked)
                        }
                      />
                      <span>
                        2차 제작 판매 안내를 이메일로 받는 데 동의합니다.
                      </span>
                    </label>
                    {/* 광고성 정보라 항목·목적·기간·거부 권리를 받는 자리에서 밝힌다. */}
                    <small className="gsf-field-help">
                      수집 항목: 이메일 주소 · 이용 목적: 2차 제작 판매 안내 ·
                      보유 기간: 수집일로부터 1년. 동의하지 않아도 설문 응답은
                      이미 저장됐으며 어떤 불이익도 없습니다. 수신을 원하지
                      않으시면 언제든 문의하기로 알려주시면 바로 지워드립니다.
                    </small>
                    <button
                      type="button"
                      className="gsf-secondary"
                      onClick={() => void submitNoticeEmail()}
                      disabled={!noticeReady}
                    >
                      {noticeState === "saving"
                        ? "저장하고 있어요..."
                        : "2차 소식 받기"}
                    </button>
                    {noticeError && (
                      <p className="gsf-field-error" role="alert">
                        {noticeError}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* 사연은 굿즈 자리와 상관없이 남길 수 있다. 아직 쓰지 않았다면
                  여기서 한 번 더 길을 열어 준다. */}
              {!story.scene.trim() && (
                <button
                  type="button"
                  className="gsf-primary"
                  onClick={() => {
                    trackEvent("story_start");
                    if (draftSession) {
                      persistSnapshot(
                        draftSession,
                        answers,
                        currentQuestionId,
                        questionActiveMs,
                        "story"
                      );
                    }
                    setStage("story");
                  }}
                >
                  사연도 남기기
                  <ArrowRight aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="gsf-text-button"
                onClick={() => setLocation("/goods-survey")}
              >
                처음 화면으로 돌아가기
              </button>
            </section>
          )}

          {stage === "complete" && (
            <section className="gsf-message gsf-complete">
              <span className="gsf-message-icon">
                <Check aria-hidden="true" />
              </span>
              <span className="gsf-eyebrow">신청 완료</span>
              <h1>
                굿즈 신청이
                <br />
                정상적으로 접수됐어요.
              </h1>
              <p>
                설문 응답과 제작·배송 정보는 분리해 안전하게 저장했습니다. 제작
                관련 안내는 입력한 연락처로 전달드릴게요.
              </p>
              <div className="gsf-review-id">
                <span>접수 확인 번호</span>
                <strong>{reviewId}</strong>
              </div>
              <p className="gsf-review-submit-note">
                현재 남은 자리 {remaining}명
              </p>
              <button
                type="button"
                className="gsf-primary"
                onClick={() => setLocation("/goods-survey")}
              >
                랜딩페이지로 돌아가기
              </button>
              <button
                type="button"
                className="gsf-text-button"
                onClick={resetSurvey}
              >
                새 응답 작성하기
              </button>
            </section>
          )}
        </div>

        {stage === "questions" && currentQuestion && (
          <div className="gsf-bottom-actions">
            <button
              type="button"
              className="gsf-primary"
              onClick={goNext}
              disabled={!hasAnswer || apiBusy}
            >
              {terminatingAnswerSelected ? "설문 종료" : "다음"}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {privacyOpen && (
        <div
          className="gsf-modal-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.currentTarget === event.target) setPrivacyOpen(false);
          }}
        >
          <section
            className="gsf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-modal-title"
          >
            <button
              type="button"
              className="gsf-modal-close"
              onClick={() => setPrivacyOpen(false)}
              aria-label="닫기"
            >
              <X aria-hidden="true" />
            </button>
            <span className="gsf-message-icon">
              <LockKeyhole aria-hidden="true" />
            </span>
            <h2 id="privacy-modal-title">개인정보 수집·이용 안내</h2>
            <dl>
              {goodsSurveyPrivacyContent.map(([term, description]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              className="gsf-primary"
              onClick={() => setPrivacyOpen(false)}
            >
              확인했습니다
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
