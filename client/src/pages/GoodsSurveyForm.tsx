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
  trackEvent,
} from "@/lib/analytics/analytics";
import { useActiveTime, usePageEngagement } from "@/lib/analytics/react";
import {
  GOODS_SURVEY_VERSION,
  GoodsSurveyApiError,
  completeSurvey as completeSurveyRequest,
  createSurveyDraft,
  saveSurveyDraft,
  saveSurveyStory,
  submitSurveyApplication,
  uploadSurveyPhoto,
  type SurveyDraftSession,
} from "@/lib/goodsSurveyApi";
import {
  clearGoodsSurveyDraftSnapshot,
  loadGoodsSurveyDraft,
  saveGoodsSurveyDraftSnapshot,
} from "@/lib/goodsSurveyDraftStorage";
import {
  getNextMultiSelection,
  getQuestionOptions,
  getQuestionTitle,
  getVisibleQuestions,
  isSurveyTerminated,
  type SurveyAnswers,
  type SurveyQuestion,
} from "./goodsSurveySchema";
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

const storySelects = {
  status: ["함께 살고 있다", "이별했다", "답하고 싶지 않다"],
  age: ["2세 이하", "3~5세", "6~8세", "9~11세", "12세 이상 또는 모름"],
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

function StoryTextarea({
  label,
  prompt,
  value,
  onChange,
  maxLength,
  optional = true,
}: {
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
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
        {value.length.toLocaleString()} / {maxLength.toLocaleString()}자
      </small>
    </label>
  );
}

function QuestionScreen({
  question,
  answers,
  onAnswer,
}: {
  question: SurveyQuestion;
  answers: SurveyAnswers;
  onAnswer: (value: string | string[]) => void;
}) {
  const options = getQuestionOptions(question, answers);
  const answer = answers[question.id];
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];

  const toggleOption = (optionId: string) => {
    if (question.kind !== "multi") {
      onAnswer(optionId);
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
    <section className="gsf-question" aria-labelledby="survey-question-title">
      {question.notice && (
        <div className="gsf-notice">
          <Info aria-hidden="true" />
          <div>
            <strong>{question.notice.title}</strong>
            {question.notice.paragraphs.map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      <div className="gsf-question-heading">
        <span>{question.number}</span>
        <small>{question.section}</small>
      </div>

      {question.matrix && (
        <div className="gsf-matrix-context">
          <span>
            항목 {question.matrix.index}/{question.matrix.total}
          </span>
          <p>{question.matrix.title}</p>
        </div>
      )}

      <h1 id="survey-question-title">{getQuestionTitle(question, answers)}</h1>
      {question.helper && <p className="gsf-helper">{question.helper}</p>}

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
    </section>
  );
}

export default function GoodsSurveyForm() {
  const [, setLocation] = useLocation();
  const initialGoods = useMemo(
    () => new URLSearchParams(window.location.search).get("goods") ?? "acrylic",
    []
  );
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
  const [answers, setAnswers] = useState<SurveyAnswers>(
    () => restoredDraft?.answers ?? {}
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
  const [storyConsent, setStoryConsent] = useState({
    analysis: false,
    publish: false,
    reviewContact: false,
    interview: false,
  });
  const [production, setProduction] = useState<ProductionFields>({
    goods: productionGoods.some(([id]) => id === initialGoods)
      ? initialGoods
      : "acrylic",
    customGoods: "",
    petName: "",
    guardianName: "",
    phone: "",
    postalCode: "",
    address: "",
    addressDetail: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [shippingConsent, setShippingConsent] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [reviewId, setReviewId] = useState("");
  const [remaining, setRemaining] = useState(
    () => restoredDraft?.session.remaining ?? 73
  );
  const [apiBusy, setApiBusy] = useState(false);
  const [apiError, setApiError] = useState("");
  const [draftSaveState, setDraftSaveState] = useState<
    "idle" | "saving" | "saved" | "offline"
  >("idle");
  const [submissionProgress, setSubmissionProgress] = useState("");
  const [surveyRun, setSurveyRun] = useState(0);
  const surveyCompletionTracked = useRef(false);
  const fileClientIds = useRef(new Map<string, string>());
  const idempotencyKey = useRef(createClientId());
  const draftSaveQueue = useRef(Promise.resolve());
  const navigationLocked = useRef(false);

  const visibleQuestions = useMemo(
    () => getVisibleQuestions(answers),
    [answers]
  );
  const currentIndex = Math.max(
    0,
    visibleQuestions.findIndex(question => question.id === currentQuestionId)
  );
  const currentQuestion = visibleQuestions[currentIndex] ?? visibleQuestions[0];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const hasAnswer = Array.isArray(currentAnswer)
    ? currentAnswer.length > 0
    : Boolean(currentAnswer);
  const progress =
    visibleQuestions.length > 0
      ? Math.round(((currentIndex + 1) / visibleQuestions.length) * 100)
      : 0;
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
      goods_type: production.goods,
    });
  }, [stage]);

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
      selectedGoods: production.goods,
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
    const payload = buildSavePayload(nextAnswers, nextQuestionId, timings);
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
          selectedGoods: production.goods,
          tracking: createSubmissionTrackingContext(),
        });
        setDraftSession(session);
        setRemaining(session.remaining);
        persistSnapshot(session, {}, "q1", {}, "questions");
      }

      trackEvent("survey_start", {
        entry_method: wasResume ? "resume_button" : "intro_button",
        goods_type: production.goods,
      });

      if (session.status === "RESERVED") {
        setStage(
          restoredDraft?.stage && restoredDraft.stage !== "questions"
            ? restoredDraft.stage
            : "closing"
        );
      } else if (session.status === "COMPLETED_NO_SLOT") {
        setStage("full");
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
            goods_reserved: completion.status === "RESERVED",
          },
          { eventId: tracking.conversionEventId }
        );
      }

      if (completion.status === "COMPLETED_NO_SLOT") {
        clearGoodsSurveyDraftSnapshot();
        setStage("full");
        return;
      }

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
      setApiError("설문 연결 정보가 없습니다. 처음 화면에서 다시 시작해 주세요.");
      return;
    }

    const nextVisible = getVisibleQuestions(nextAnswers);
    const index = nextVisible.findIndex(
      question => question.id === currentQuestionId
    );
    const nextQuestion = nextVisible[index + 1];
    if (!isSurveyTerminated(nextAnswers) && nextQuestion) {
      setCurrentQuestionId(nextQuestion.id);
      persistSnapshot(
        draftSession,
        nextAnswers,
        nextQuestion.id,
        timings,
        "questions"
      );
      queueDraftSave(draftSession, nextAnswers, nextQuestion.id, timings);
      return;
    }

    await completeCurrentSurvey(draftSession, nextAnswers, timings);
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
    if (stage === "story") {
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
    const previousQuestion = visibleQuestions[currentIndex - 1];
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
        queueDraftSave(
          draftSession,
          answers,
          previousQuestion.id,
          timings
        );
      }
    } else {
      setStage("intro");
    }
  };

  const updateStory = (field: keyof StoryFields, value: string) =>
    setStory(previous => ({ ...previous, [field]: value }));

  const storyReady =
    Boolean(
      story.status && story.age && story.condition && story.scene.trim()
    ) && storyConsent.analysis;

  const productionReady =
    photos.length > 0 &&
    Boolean(
      production.goods &&
        production.petName.trim() &&
        production.guardianName.trim() &&
        production.phone.trim() &&
        production.postalCode.trim() &&
        production.address.trim()
    ) &&
    (production.goods !== "custom" || Boolean(production.customGoods.trim())) &&
    privacyConsent &&
    shippingConsent;
  const reservationDeadline = draftSession?.reservationExpiresAt
    ? new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(draftSession.reservationExpiresAt))
    : null;

  const continueToProduction = () => {
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

  const saveStoryAndContinue = async () => {
    if (!draftSession || !storyReady || apiBusy) return;
    setApiBusy(true);
    setApiError("");
    try {
      await saveSurveyStory(draftSession, {
        ...story,
        analysisAgreed: storyConsent.analysis,
        publishAgreed: storyConsent.publish,
        reviewContactAgreed: storyConsent.reviewContact,
        interviewAgreed: storyConsent.interview,
      });
      continueToProduction();
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
          const key = `${file.name}:${file.size}:${file.lastModified}`;
          let clientFileId = fileClientIds.current.get(key);
          if (!clientFileId) {
            clientFileId = createClientId();
            fileClientIds.current.set(key, clientFileId);
          }
          return uploadSurveyPhoto(draftSession, file, clientFileId);
        })
      );

      setSubmissionProgress("신청 정보를 저장하고 선착순 자리를 확정하고 있어요.");
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
      trackEvent(
        "application_complete",
        {
          goods_type: production.goods,
          photo_count: photos.length,
          story_included: Boolean(story.scene.trim()),
        },
        { eventId: tracking.conversionEventId }
      );
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
      analysis: false,
      publish: false,
      reviewContact: false,
      interview: false,
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
    setStage("intro");
  };

  return (
    <main className="goods-survey-form-page">
      <div className="gsf-shell">
        <div className="gsf-review-banner">
          설문 자동 저장 · 제작·배송 정보는 선착순 확정 후 별도 수집
        </div>

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
          <div className="gsf-progress" aria-label={`설문 진행률 ${progress}%`}>
            <div>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              <strong>{progress}%</strong>
              <span>
                {currentIndex + 1} / 예상 {visibleQuestions.length}단계
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
              <span className="gsf-eyebrow">
                <Heart aria-hidden="true" />
                오늘을 더 기억하기 위한 조사
              </span>
              <h1>
                함께 있는 오늘을
                <br />더 오래 기억하기 위해
              </h1>
              <p>
                저희는 <strong>오늘을 더 잘 기억하는 서비스</strong>를 만들고
                있어요. 그래서 아이와의 일상과 돌봄 경험을 질문드립니다.
              </p>
              <div className="gsf-intro-card">
                <Sparkles aria-hidden="true" />
                <div>
                  <strong>답하기 어려우면 건너뛰어도 괜찮아요</strong>
                  <p>
                    후반부에는 노화·아픔에 관한 질문도 조금 있어요. 정답은
                    없으며, 여러분의 속도로 답해 주세요.
                  </p>
                </div>
              </div>
              <div className="gsf-intro-meta">
                <span>객관식 중심</span>
                <span>약 10~15분</span>
                <span>만 18세 이상</span>
              </div>
              <p className="gsf-baseline">
                여러 반려견이 있다면 현재 가장 많이 돌보는 아이 한 마리, 이별
                경험을 중심으로 답한다면 가장 최근에 이별한 아이 한 마리를
                떠올려 주세요.
              </p>
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

          {stage === "questions" && currentQuestion && (
            <QuestionScreen
              question={currentQuestion}
              answers={answers}
              onAnswer={value =>
                setAnswers(previous => ({
                  ...previous,
                  [currentQuestion.id]: value,
                }))
              }
            />
          )}

          {stage === "terminated" && (
            <section className="gsf-message">
              <span className="gsf-message-icon">
                <Heart aria-hidden="true" />
              </span>
              <h1>응답해 주셔서 감사합니다.</h1>
              <p>
                이번 조사는 반려견을 직접 돌본 경험이 있는 분을 대상으로
                진행하고 있어 여기에서 마무리됩니다.
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
              <h1>
                아이와의 시간을 떠올리며
                <br />
                답해 주셔서 감사합니다.
              </h1>
              <p>
                우리가 바라는 것은 이별을 미리 연습하는 일이 아닙니다. 오늘 한
                번 더 바라보고, 함께 걷고, 한 장 더 남기며 아이와의 시간을 더
                행복하게 채우는 일입니다.
              </p>
              <p className="gsf-reservation-note">
                선착순 자리는{" "}
                {reservationDeadline
                  ? `오늘 ${reservationDeadline}까지`
                  : "설문 완료 후 15분 동안"}{" "}
                임시 보관됩니다.
              </p>
              <div className="gsf-choice-card">
                <strong>체크만으로 다 담기지 않은 장면이 있나요?</strong>
                <p>
                  사연 작성은 선택이며, 작성하지 않아도 굿즈 신청에 불이익이
                  없습니다.
                </p>
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
                  사연 남기기
                  <ArrowRight aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="gsf-secondary"
                  onClick={() => {
                    trackEvent("story_skip", {
                      skip_placement: "closing",
                    });
                    continueToProduction();
                  }}
                >
                  설문만 제출하고 굿즈 신청하기
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
              <h1>그날부터, 아이가 조금 다르게 보이기 시작했어요.</h1>
              <p className="gsf-form-lead">
                아주 작은 장면도 괜찮습니다. 지금 함께 사는 이야기와 이미 작별한
                이야기 모두 소중하게 듣겠습니다.
              </p>

              <div className="gsf-form-card">
                <label>
                  <FieldLabel>지금 아이와 함께 살고 있나요?</FieldLabel>
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
                  <FieldLabel>아이의 현재 또는 이별 당시 나이</FieldLabel>
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
                  <FieldLabel>이야기 속 당시 아이의 상태</FieldLabel>
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

              <StoryTextarea
                label="행복한데도 시간이 영원하지 않다는 생각이 스친 장면"
                prompt="어디에 있었고 아이는 무엇을 하고 있었나요? 표정, 걸음, 소리, 날씨처럼 기억나는 단서부터 들려주세요."
                value={story.scene}
                onChange={value => updateStory("scene", value)}
                maxLength={1000}
                optional={false}
              />
              <StoryTextarea
                label="그 장면 뒤 나도 모르게 달라진 하루"
                prompt="사진을 더 찍거나 산책길을 바꾼 일처럼 실제로 달라진 행동이 있었나요?"
                value={story.changedDay}
                onChange={value => updateStory("changedDay", value)}
                maxLength={700}
              />
              <StoryTextarea
                label="지금을 후회 없이 보내기 위해 시작한 것"
                prompt="더 자주 하고 싶은 일, 미루지 않기로 한 일, 오래 기억하기 위해 남기는 것이 있나요?"
                value={story.startedNow}
                onChange={value => updateStory("startedNow", value)}
                maxLength={700}
              />
              <StoryTextarea
                label="검색창에 썼다가 지웠거나 끝내 묻지 못한 말"
                prompt="알고 싶었지만 알게 될까 두려워 차마 묻지 못한 말이 있었나요?"
                value={story.unsaidSearch}
                onChange={value => updateStory("unsaidSearch", value)}
                maxLength={500}
              />
              <StoryTextarea
                label="누군가 그때 조용히 알려주었으면 했던 것"
                prompt="누가, 어느 순간에, 어떤 말로 다가왔다면 부담 없이 받아들일 수 있었을까요?"
                value={story.neededHelp}
                onChange={value => updateStory("neededHelp", value)}
                maxLength={700}
              />

              {story.status === "함께 살고 있다" && (
                <StoryTextarea
                  label="아직은 생각하고 싶지 않아 미루고 있는 것"
                  prompt="언젠가는 알아야 하지만 '지금은 아직'이라며 미뤄둔 것이 있나요?"
                  value={story.postponed}
                  onChange={value => updateStory("postponed", value)}
                  maxLength={700}
                />
              )}

              {story.status === "이별했다" && (
                <>
                  <StoryTextarea
                    label="지나고 나서야 조금 더 일찍 알았더라면 생각한 것"
                    prompt="미리 알았더라면 아이와 나 모두 조금 덜 힘들었을 것 같은 것이 있나요?"
                    value={story.wishKnownEarlier}
                    onChange={value => updateStory("wishKnownEarlier", value)}
                    maxLength={800}
                  />
                  <StoryTextarea
                    label="마지막 무렵 가장 필요했던 실제 도움"
                    prompt="가장 필요했던 도움이나, 선의였지만 힘이 되지 않았던 말이 있었나요?"
                    value={story.finalHelp}
                    onChange={value => updateStory("finalHelp", value)}
                    maxLength={800}
                  />
                </>
              )}

              <StoryTextarea
                label="오늘의 아이에게 남기는 한 문장"
                prompt="지금 곁에 있는 아이에게, 또는 마음속에 남은 아이에게 한 문장만 건넨다면 무엇인가요?"
                value={story.oneLine}
                onChange={value => updateStory("oneLine", value)}
                maxLength={100}
              />

              <div className="gsf-consent-card">
                <strong>사연 이용 동의</strong>
                <label>
                  <input
                    type="checkbox"
                    checked={storyConsent.analysis}
                    onChange={event =>
                      setStoryConsent(previous => ({
                        ...previous,
                        analysis: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    익명 연구·서비스 개선 분석에 동의합니다. <em>필수</em>
                  </span>
                </label>
                {[
                  ["publish", "웹사이트·SNS 익명 소개에 동의합니다."],
                  ["reviewContact", "게시 전 문안 확인 연락에 동의합니다."],
                  ["interview", "후속 인터뷰 연락에 동의합니다."],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={storyConsent[key as keyof typeof storyConsent]}
                      onChange={event =>
                        setStoryConsent(previous => ({
                          ...previous,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      {label} <em>선택</em>
                    </span>
                  </label>
                ))}
                <p>
                  공개에 동의하지 않아도 사연 제출과 굿즈 신청에 불이익이
                  없습니다.
                </p>
              </div>

              <button
                type="submit"
                className="gsf-primary"
                disabled={!storyReady || apiBusy}
              >
                {apiBusy
                  ? "사연을 저장하고 있어요..."
                  : "사연 저장하고 굿즈 신청하기"}
                <ArrowRight aria-hidden="true" />
              </button>
              <button
                type="button"
                className="gsf-text-button"
                onClick={() => {
                  trackEvent("story_skip", {
                    skip_placement: "story_form",
                  });
                  continueToProduction();
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
              <h1>우리 아이 굿즈 제작 정보를 알려주세요.</h1>
              <p className="gsf-form-lead">
                설문 응답과 제작·배송 정보는 무작위 응답 ID로만 연결됩니다.
                {reservationDeadline &&
                  ` 선착순 자리는 오늘 ${reservationDeadline}까지 보관됩니다.`}
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
              </section>

              <section className="gsf-form-section">
                <h2>2. 반려견 사진</h2>
                <label className="gsf-upload">
                  <Upload aria-hidden="true" />
                  <strong>사진 선택하기</strong>
                  <span>JPG·PNG·WEBP, 장당 10MB 이하·최대 5장</span>
                  <input
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
                          ) ||
                          file.size > 10 * 1024 * 1024
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
                  <ul className="gsf-file-list">
                    {photos.map(file => (
                      <li key={`${file.name}-${file.lastModified}`}>
                        <Check aria-hidden="true" />
                        <span>{file.name}</span>
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
                    />
                  </label>
                ))}
              </section>

              <section className="gsf-form-section gsf-safety-summary">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <h2>제품 안전 안내</h2>
                  <p>
                    본 굿즈는 보호자용 키링 또는 전시용입니다. 반려견이 물거나
                    삼키지 않도록 손이 닿지 않는 곳에서 사용해 주세요.
                  </p>
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
                {apiBusy ? "신청을 안전하게 저장하고 있어요..." : "신청 완료하기"}
                <ArrowRight aria-hidden="true" />
              </button>
              {submissionProgress && (
                <p className="gsf-review-submit-note" role="status">
                  {submissionProgress}
                </p>
              )}
            </form>
          )}

          {stage === "full" && (
            <section className="gsf-message gsf-complete">
              <span className="gsf-message-icon">
                <Heart aria-hidden="true" />
              </span>
              <span className="gsf-eyebrow">설문 응답 완료</span>
              <h1>
                답변은 안전하게 저장됐지만
                <br />
                무료 제작은 마감됐어요.
              </h1>
              <p>
                설문을 마치는 사이 선착순 100명이 모두 확정되었습니다. 배송
                정보와 사진은 수집하지 않았습니다.
              </p>
              <button
                type="button"
                className="gsf-primary"
                onClick={() => setLocation("/goods-survey")}
              >
                랜딩페이지로 돌아가기
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
                선착순 굿즈 신청이
                <br />
                정상적으로 접수됐어요.
              </h1>
              <p>
                설문 응답과 제작·배송 정보는 분리해 안전하게 저장했습니다.
                제작 관련 안내는 입력한 연락처로 전달드릴게요.
              </p>
              <div className="gsf-review-id">
                <span>접수 확인 번호</span>
                <strong>{reviewId}</strong>
              </div>
              <p className="gsf-review-submit-note">
                현재 남은 무료 제작 자리 {remaining}명
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
              다음
              <ArrowRight aria-hidden="true" />
            </button>
            {currentQuestion.id !== "q1" && (
              <button
                type="button"
                className="gsf-skip"
                onClick={skipQuestion}
                disabled={apiBusy}
              >
                이 문항 건너뛰기
              </button>
            )}
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
              <div>
                <dt>수집 항목</dt>
                <dd>반려견 사진, 이름·연락처, 배송지</dd>
              </div>
              <div>
                <dt>이용 목적</dt>
                <dd>굿즈 제작·발송, 문의 대응</dd>
              </div>
              <div>
                <dt>보유·파기</dt>
                <dd>배송 완료 후 3개월 뒤 삭제</dd>
              </div>
              <div>
                <dt>동의 거부</dt>
                <dd>
                  동의를 거부할 수 있으며, 거부 시 제작 및 배송이 어렵습니다.
                </dd>
              </div>
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
