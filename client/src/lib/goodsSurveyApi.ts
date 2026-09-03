export const GOODS_SURVEY_VERSION = "2026-07-25-v2";

// 실제 정원은 서버 캠페인이 정한다. 이 값은 응답이 오기 전에만 쓰는 자리값이다.
export const GOODS_SURVEY_CAPACITY = 100;

/**
 * 제작에 필요한 사진 장수.
 *
 * 얼굴·전신·털무늬 세 종이 최소 구성이다. 아무 사진 세 장이 아니라 칸마다
 * 무엇을 찍어야 하는지가 정해져 있고, 그래서 랜딩의 등록 칸도 세 개다.
 *
 * 랜딩과 주문 화면이 서로 다른 수를 들고 있었다 — 랜딩은 세 칸을 다 채워야
 * 열리는데 주문 화면은 한 장이면 열렸다. 두 화면이 같은 값을 보게 여기 둔다.
 *
 * 근거: [카톡 나혜님] "사진 3개 이상 등록해야 제출 버튼 활성화되도록
 *       변경해주세요. 즉, 사진 3개 이상만 제출 가능하도록 (3-5개)"
 */
export const GOODS_PHOTO_MIN_COUNT = 3;
export const GOODS_PHOTO_MAX_COUNT = 5;

// 굿즈를 고르지 않고 설문에 들어온 경우. 아무것도 고르지 않아도 특정 굿즈가
// 자동으로 붙으면 실제 선호가 아닌 값이 선호도 집계에 섞인다.
export const GOODS_UNSELECTED = "unselected";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
};

export type SurveyDraftSession = {
  responseId: string;
  editToken: string;
  status: string;
  remaining: number;
  reservationExpiresAt?: string | null;
};

export type SurveyCompletion = {
  responseId: string;
  status: "RESERVED" | "COMPLETED_NO_SLOT" | "TERMINATED";
  remaining: number;
  reservationExpiresAt: string | null;
};

export type SurveyCampaign = {
  campaignId: string;
  capacity: number;
  allocated: number;
  remaining: number;
  startsAt: string;
  endsAt: string;
  /**
   * @deprecated goodsOpen과 같은 값이다. 예전 화면이 읽던 자리라 서버가 계속
   * 내려줄 뿐이니, 새 코드는 surveyOpen과 goodsOpen을 따로 본다.
   */
  open: boolean;
  /** 설문 접수 여부. 굿즈가 마감돼도 설문은 따로 열린다. */
  surveyOpen: boolean;
  /** 굿즈 접수 여부. 서버가 스위치와 남은 정원을 모두 본 결과다. */
  goodsOpen: boolean;
};

export type SurveyTrackingPayload = object;

export type SaveSurveyPayload = {
  answers: Record<string, string | string[] | undefined>;
  currentQuestionId: string;
  surveyActiveMs: number;
  questionActiveMs: Record<string, number>;
  tracking: SurveyTrackingPayload;
};

export type StoryPayload = {
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
  analysisAgreed: boolean;
  publishAgreed: boolean;
};

export type ApplicationPayload = {
  goodsType: string;
  customGoods: string;
  petName: string;
  guardianName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  photoIds: string[];
  publicPhotoIds: string[];
  conversionEventId: string;
  tracking: SurveyTrackingPayload;
  privacyAgreed: boolean;
  shippingConfirmed: boolean;
  /** 광고성 정보 수신 동의. 선택 항목이라 false 로 와도 신청은 성립한다. */
  marketingAgreed: boolean;
};

type PhotoUpload = {
  photoId: string;
  status: "PENDING" | "CONFIRMED";
  uploadUrl: string | null;
  headers: Record<string, string>;
  expiresAt: string;
};

export class GoodsSurveyApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GoodsSurveyApiError";
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const resolveApiUrl = (path: string) =>
  apiBaseUrl
    ? `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`
    : path;

const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // 아래 공통 오류로 변환한다.
  }

  if (!response.ok || !envelope?.success) {
    throw new GoodsSurveyApiError(
      envelope?.message ??
        "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      envelope?.code ?? "NETWORK_ERROR",
      response.status
    );
  }
  return envelope.data as T;
};

const editHeaders = (session: SurveyDraftSession) => ({
  "X-Survey-Edit-Token": session.editToken,
});

export const getSurveyCampaign = () =>
  apiRequest<SurveyCampaign>("/api/public/goods-survey/campaign");

export const createSurveyDraft = (payload: {
  questionnaireVersion: string;
  selectedGoods: string;
  tracking: SurveyTrackingPayload;
}) =>
  apiRequest<SurveyDraftSession>("/api/public/goods-survey/responses", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const saveSurveyDraft = (
  session: SurveyDraftSession,
  payload: SaveSurveyPayload
) =>
  apiRequest<void>(`/api/public/goods-survey/responses/${session.responseId}`, {
    method: "PATCH",
    headers: editHeaders(session),
    body: JSON.stringify(payload),
  });

export const completeSurvey = (
  session: SurveyDraftSession,
  payload: SaveSurveyPayload
) =>
  apiRequest<SurveyCompletion>(
    `/api/public/goods-survey/responses/${session.responseId}/complete`,
    {
      method: "POST",
      headers: editHeaders(session),
      body: JSON.stringify(payload),
    }
  );

/**
 * 설문을 건너뛰고 바로 굿즈 신청으로 간다.
 *
 * 적용가는 정가다. 설문을 마친 사람은 할인가를 받으므로, 이 길로 들어온
 * 사람에게는 신청 전에 값이 다르다는 것을 먼저 보여줘야 한다.
 */
export const startDirectPurchase = (session: SurveyDraftSession) =>
  apiRequest<SurveyCompletion>(
    `/api/public/goods-survey/responses/${session.responseId}/direct-purchase`,
    {
      method: "POST",
      headers: editHeaders(session),
    }
  );

/**
 * 2차 제작 안내를 받을 이메일을 남긴다.
 *
 * 서버는 이 주소를 설문 응답과 연결해 저장하지 않는다. 설문을 마친 사람인지만
 * 요청 시점에 확인한다.
 */
export const subscribeSurveyNotice = (
  session: SurveyDraftSession,
  email: string
) =>
  apiRequest<void>(
    `/api/public/goods-survey/responses/${session.responseId}/notice-subscription`,
    {
      method: "POST",
      headers: editHeaders(session),
      body: JSON.stringify({ email, noticeAgreed: true }),
    }
  );

/**
 * 안내 메일 수신을 거부한다.
 *
 * 값은 본문으로 보낸다. 주소에 실으면 링크를 거치는 모든 곳에 남는다.
 * 서버는 맞지 않는 값에도 성공으로 답한다 — 어떤 값이 살아 있는지 알려 주면
 * 그것으로 하나씩 넣어 볼 수 있게 된다.
 */
export const unsubscribeSurveyNotice = (token: string) =>
  apiRequest<void>(
    "/api/public/goods-survey/notice-subscriptions/unsubscribe",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    }
  );

export const saveSurveyStory = (
  session: SurveyDraftSession,
  payload: StoryPayload
) =>
  apiRequest<void>(
    `/api/public/goods-survey/responses/${session.responseId}/story`,
    {
      method: "PUT",
      headers: editHeaders(session),
      body: JSON.stringify(payload),
    }
  );

const createPhotoUpload = (
  session: SurveyDraftSession,
  file: File,
  clientFileId: string
) =>
  apiRequest<PhotoUpload>(
    `/api/public/goods-survey/responses/${session.responseId}/photos/presign`,
    {
      method: "POST",
      headers: editHeaders(session),
      body: JSON.stringify({
        clientFileId,
        contentType: file.type,
        size: file.size,
      }),
    }
  );

const confirmPhotoUpload = (session: SurveyDraftSession, photoId: string) =>
  apiRequest<PhotoUpload>(
    `/api/public/goods-survey/responses/${session.responseId}/photos/${photoId}/confirm`,
    {
      method: "POST",
      headers: editHeaders(session),
    }
  );

export const uploadSurveyPhoto = async (
  session: SurveyDraftSession,
  file: File,
  clientFileId: string
) => {
  const upload = await createPhotoUpload(session, file, clientFileId);
  if (upload.status === "CONFIRMED") return upload.photoId;
  if (!upload.uploadUrl) {
    throw new GoodsSurveyApiError(
      "사진 업로드 주소를 받지 못했습니다.",
      "SURVEY_PHOTO_NOT_READY",
      500
    );
  }

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: upload.headers,
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new GoodsSurveyApiError(
      "사진 업로드에 실패했습니다. 다시 시도해 주세요.",
      "FILE_UPLOAD_FAILED",
      uploadResponse.status
    );
  }

  const confirmed = await confirmPhotoUpload(session, upload.photoId);
  return confirmed.photoId;
};

export const submitSurveyApplication = (
  session: SurveyDraftSession,
  idempotencyKey: string,
  payload: ApplicationPayload
) =>
  apiRequest<{
    responseId: string;
    applicationId: number;
    status: "SUBMITTED";
    remaining: number;
    /** 설문에 답하고 온 신청인지. 완료 화면이 어떤 값을 보여줄지 가른다. */
    surveyParticipant: boolean;
    /** 고객에게 읽어 줄 주문번호. */
    orderNumber: string;
    /** 정상가. */
    listPriceKrw: number;
    /** 할인액. 없으면 0. */
    discountAmountKrw: number;
    /** 배송비. 화면에는 따로 보여 주고 청구는 아래 금액에 합쳐져 있다. */
    shippingFeeKrw: number;
    /**
     * 실제 청구할 금액.
     *
     * 이름을 서버와 똑같이 둔다. 예전에 appliedPriceKrw 로 적어 두었는데
     * 서버에는 그런 값이 없어서 undefined 를 읽고 있었다. 주문은 성공했는데
     * 완료 화면만 깨진다.
     */
    paymentAmountKrw: number;
  }>(`/api/public/goods-survey/responses/${session.responseId}/application`, {
    method: "POST",
    headers: {
      ...editHeaders(session),
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
