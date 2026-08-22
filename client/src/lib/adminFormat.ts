/**
 * 관리자 화면의 표시 형식.
 *
 * 서버는 시각을 UTC 로 내려준다. 브라우저 기본 시간대에 맡기면 해외에서 열었을
 * 때 다른 시각이 보인다. 결제 만료가 30분이라 몇 시간 어긋나면 지난 것을 아직
 * 남은 것으로 읽는다. 그래서 시간대를 한국으로 고정한다.
 */

const KST = "Asia/Seoul";

export const formatKrw = (amount: number | null | undefined): string =>
  amount == null ? "-" : `${new Intl.NumberFormat("ko-KR").format(amount)}원`;

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
};

/**
 * 남은 시간.
 *
 * 결제 대기 주문이 언제 만료되는지 보여 준다. 지난 것은 "만료"로 적는다.
 */
export const formatRemaining = (
  expiresAt: string | null | undefined,
  now: Date
): string => {
  if (!expiresAt) return "-";
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return "-";

  const remainingMs = parsed.getTime() - now.getTime();
  if (remainingMs <= 0) return "만료";

  const minutes = Math.floor(remainingMs / 60_000);
  if (minutes < 60) return `${minutes}분 남음`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 ${minutes % 60}분 남음`;
};
