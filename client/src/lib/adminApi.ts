/**
 * 관리자 화면이 쓰는 통로.
 *
 * 굿즈 설문 쪽과 파일을 나눈다. 설문은 로그인이 없고 관리자는 모든 요청에
 * 토큰을 싣는다. 한 파일에 두면 토큰을 붙일 곳과 붙이지 말아야 할 곳이
 * 섞인다.
 */

export type AdminRole = "ADMIN" | "PRODUCTION";

export type GoodsOrderStatus =
  | "PAYMENT_PENDING"
  | "PAYMENT_COMPLETED"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "PAYMENT_EXPIRED"
  | "PAYMENT_FAILED"
  | "CANCELED"
  | "CANCEL_FAILED"
  | "LEGACY_FREE";

export type AdminOrderSummary = {
  orderNumber: string;
  submittedAt: string;
  goodsType: string;
  petName: string;
  /** 목록에는 가려서 온다. 서버가 가린 값이라 화면에서 되돌릴 수 없다. */
  guardianNameMasked: string;
  phoneMasked: string;
  status: GoodsOrderStatus;
  statusLabel: string;
  photoCount: number;
  paymentAmountKrw: number;
  paidAt: string | null;
  trackingNumber: string | null;
};

export type AdminOrderListResponse = {
  orders: AdminOrderSummary[];
  totalCount: number;
  page: number;
  size: number;
  summary: {
    paymentCompleted: number;
    inProduction: number;
    readyToShip: number;
  };
};

export type AdminOrderDetail = {
  orderNumber: string;
  submittedAt: string;
  status: GoodsOrderStatus;
  statusLabel: string;
  goodsType: string;
  petName: string;
  pricing: {
    listPriceKrw: number;
    discountAmountKrw: number;
    promotionName: string | null;
    paymentAmountKrw: number;
  } | null;
  /** 제작팀에게는 null 로 온다. 만드는 데 필요 없는 값이다. */
  payment: {
    method: string | null;
    paidAt: string | null;
    paymentExpiresAt: string | null;
    cancelReason: string | null;
  } | null;
  shipping: {
    guardianName: string;
    phone: string;
    postalCode: string | null;
    address: string | null;
    addressDetail: string | null;
    trackingCompany: string | null;
    trackingNumber: string | null;
  } | null;
  photos: { slot: number; objectKey: string | null; filled: boolean }[];
  marketing: { agreed: boolean; agreedAt: string | null; version: string | null } | null;
  statusHistory: {
    fromStatus: string | null;
    toStatus: string;
    changedAt: string;
    changedBy: string | null;
    memo: string | null;
  }[];
  accessLogs: { action: string; adminAccountId: number; accessedAt: string }[];
};

export type AdminPhotoDownload = {
  photos: { slot: number; url: string; expiresAt: string }[];
};

export type AdminAccount = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  status: "INVITED" | "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
};

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = "AdminApiError";
  }

  /** 다시 로그인해야 하는 상황인지. 토큰 8시간이 지나면 여기로 온다. */
  get needsSignIn() {
    return this.status === 401;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const resolveApiUrl = (path: string) =>
  apiBaseUrl
    ? `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`
    : path;

/**
 * 토큰은 세션 저장소에 둔다.
 *
 * 로컬 저장소에 두면 탭을 닫아도 남는다. 고객 이름과 주소를 여는 열쇠라
 * 브라우저를 닫으면 같이 없어지는 편이 낫다.
 */
const TOKEN_KEY = "pawever.admin.accessToken";

export const readAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const writeAdminToken = (token: string) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 저장소를 막아 둔 브라우저. 이 탭에서만 쓰는 값이라 그대로 진행한다.
  }
};

export const clearAdminToken = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // 지울 것이 없다.
  }
};

/**
 * 토큰에 담긴 역할을 읽는다.
 *
 * 서명을 확인하지 않는다. 확인할 열쇠가 브라우저에 없고, 있어서도 안 된다.
 * 여기서 읽은 역할은 무엇을 보여 줄지 정하는 데만 쓴다. 토큰을 고쳐 관리자로
 * 적어 넣어도 화면에 버튼이 하나 더 보일 뿐, 서버가 받지 않는다.
 */
export const readAdminRole = (): AdminRole | null => {
  const token = readAdminToken();
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const claims = JSON.parse(atob(padded)) as { role?: string };
    return claims.role === "ADMIN" || claims.role === "PRODUCTION"
      ? claims.role
      : null;
  } catch {
    // 형태가 다른 값이 들어 있다. 역할을 모르는 것으로 둔다.
    return null;
  }
};

const adminRequest = async <T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T> => {
  const { auth = true, headers, ...rest } = init ?? {};
  const token = auth ? readAdminToken() : null;

  const response = await fetch(resolveApiUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // 아래 공통 오류로 바꾼다.
  }

  if (!response.ok || !envelope?.success) {
    // 토큰이 만료됐거나 계정이 막혔다. 들고 있어 봐야 다음 요청도 같으니 버린다.
    if (response.status === 401) {
      clearAdminToken();
    }
    throw new AdminApiError(
      envelope?.message ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      envelope?.code ?? "NETWORK_ERROR",
      response.status
    );
  }
  return envelope.data as T;
};

export const adminSignIn = async (email: string, password: string) => {
  const data = await adminRequest<{ accessToken: string }>(
    "/api/admin/auth/sign-in",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    }
  );
  writeAdminToken(data.accessToken);
  return data.accessToken;
};

export const adminAcceptInvite = (inviteToken: string, password: string) =>
  adminRequest<void>("/api/admin/auth/accept-invite", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ inviteToken, password }),
  });

export type AdminOrderFilter = {
  status?: GoodsOrderStatus[];
  q?: string;
  /** 굿즈 종류. 지금은 1종이라 걸러지는 게 없다. */
  goodsType?: string;
  /** 제출일 범위. 한국 날짜(YYYY-MM-DD)로 보낸다. */
  submittedFrom?: string;
  submittedTo?: string;
  /** 이 장수 이상. 사진이 덜 온 주문을 찾을 때 쓴다. */
  minPhotoCount?: number;
  page?: number;
  size?: number;
};

export const listAdminOrders = (params: AdminOrderFilter) => {
  const query = new URLSearchParams();
  // 상태는 값마다 한 번씩 붙인다. 서버가 List<GoodsOrderStatus> 로 받는다.
  (params.status ?? []).forEach((status) => query.append("status", status));
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.goodsType?.trim()) query.set("goodsType", params.goodsType.trim());
  if (params.submittedFrom) query.set("submittedFrom", params.submittedFrom);
  if (params.submittedTo) query.set("submittedTo", params.submittedTo);
  if (params.minPhotoCount != null)
    query.set("minPhotoCount", String(params.minPhotoCount));
  if (params.page != null) query.set("page", String(params.page));
  if (params.size != null) query.set("size", String(params.size));

  const suffix = query.toString();
  return adminRequest<AdminOrderListResponse>(
    `/api/admin/orders${suffix ? `?${suffix}` : ""}`
  );
};

export const getAdminOrder = (orderNumber: string) =>
  adminRequest<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}`
  );

/** 링크는 잠깐만 열린다. 받아 둔 주소를 저장해 두면 이력만 남고 통제가 사라진다. */
export const requestPhotoLinks = (orderNumber: string) =>
  adminRequest<AdminPhotoDownload>(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}/photo-links`,
    { method: "POST" }
  );

/**
 * 사진을 한 번에 내려받는다.
 *
 * 파일을 그대로 받으므로 봉투(ApiResponse)를 거치지 않는다. 로그인 토큰을
 * 실어야 해서 링크를 그냥 걸 수 없고, 받아서 blob 으로 저장한다.
 */
export const downloadAdminPhotoArchive = async (orderNumber: string) => {
  const token = readAdminToken();
  const response = await fetch(
    resolveApiUrl(
      `/api/admin/orders/${encodeURIComponent(orderNumber)}/photos.zip`
    ),
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminToken();
    }
    throw new AdminApiError(
      response.status === 400
        ? "받을 사진이 없습니다."
        : "사진을 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
      "PHOTO_ARCHIVE_FAILED",
      response.status
    );
  }

  return {
    blob: await response.blob(),
    fileName: `${orderNumber}_photos.zip`,
  };
};

export const changeAdminOrderStatus = (
  orderNumber: string,
  status: GoodsOrderStatus,
  memo?: string
) =>
  adminRequest<void>(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status, memo: memo?.trim() || null }),
    }
  );

export const registerAdminTracking = (
  orderNumber: string,
  trackingCompany: string,
  trackingNumber: string
) =>
  adminRequest<void>(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}/tracking`,
    {
      method: "POST",
      body: JSON.stringify({ trackingCompany, trackingNumber }),
    }
  );

export const listAdminAccounts = () =>
  adminRequest<AdminAccount[]>("/api/admin/accounts");

export const inviteAdminAccount = (
  email: string,
  name: string,
  role: AdminRole
) =>
  adminRequest<{ inviteToken: string }>("/api/admin/accounts", {
    method: "POST",
    body: JSON.stringify({ email, name, role }),
  });

export const reinviteAdminAccount = (accountId: number) =>
  adminRequest<{ inviteToken: string }>(
    `/api/admin/accounts/${accountId}/reinvite`,
    { method: "POST" }
  );

export const disableAdminAccount = (accountId: number) =>
  adminRequest<void>(`/api/admin/accounts/${accountId}`, { method: "DELETE" });
