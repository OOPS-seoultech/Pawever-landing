const ACCESS_ACTION_LABELS: Record<string, string> = {
  ADDRESS_VIEW: "배송 정보 열람",
  PHOTO_VIEW: "고객 사진 열람",
  PHOTO_DOWNLOAD: "고객 사진 다운로드",
  ORDER_CANCEL: "주문 취소",
  ORDER_CANCEL_FAILED: "주문 취소 실패",
};

export const accessActionLabel = (action: string): string =>
  ACCESS_ACTION_LABELS[action] ?? action;
