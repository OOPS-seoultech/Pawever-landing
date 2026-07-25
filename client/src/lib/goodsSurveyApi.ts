export const GOODS_SURVEY_VERSION = "2026-07-23-v1";

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
  open: boolean;
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
  reviewContactAgreed: boolean;
  interviewAgreed: boolean;
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
  conversionEventId: string;
  tracking: SurveyTrackingPayload;
  privacyAgreed: boolean;
  shippingConfirmed: boolean;
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
      envelope?.message ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
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
  apiRequest<void>(
    `/api/public/goods-survey/responses/${session.responseId}`,
    {
      method: "PATCH",
      headers: editHeaders(session),
      body: JSON.stringify(payload),
    }
  );

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

const confirmPhotoUpload = (
  session: SurveyDraftSession,
  photoId: string
) =>
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
  }>(
    `/api/public/goods-survey/responses/${session.responseId}/application`,
    {
      method: "POST",
      headers: {
        ...editHeaders(session),
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    }
  );
