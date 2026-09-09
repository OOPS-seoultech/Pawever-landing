/**
 * 고른 사진을 서버에 뭐라고 말할지 정한다.
 *
 * 서버는 image/jpeg·image/png·image/webp 셋만 받고, 받은 뒤 매직바이트까지
 * 확인한다. 그래서 여기서 이름만 보고 우겨도 업로드가 끝난 다음에 거절당한다 —
 * 사진을 다 올리고 기다린 뒤에 실패하는 쪽이 더 나쁘므로, 받을 수 없는 것은
 * 고르는 자리에서 잘라 낸다.
 *
 * 다만 브라우저가 형식을 안 알려 주는 경우가 있다. 카카오톡 같은 인앱
 * 브라우저와 일부 안드로이드 갤러리는 File.type 을 빈 값으로 준다. 멀쩡한
 * JPG 인데 "형식을 모르겠다"는 이유로 거절하면, 현장에서 카톡 QR 로 들어온
 * 사람이 사진을 한 장도 못 올린다. 그때는 이름 끝을 본다.
 */

const BY_TYPE = new Set(["image/jpeg", "image/png", "image/webp"]);

const BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * 아이폰 기본 형식(HEIC)으로 온 사람에게 할 일을 알려 준다.
 *
 * "JPG·PNG·WEBP 만 됩니다"는 사실이지만 무엇을 하면 되는지는 말해 주지
 * 않는다. 줄이 선 자리에서 되묻게 만드는 안내는 안내가 아니다. 스크린샷은
 * 어느 폰에서나 PNG 로 저장되므로 그 자리에서 바로 된다.
 */
export const PHOTO_TYPE_HELP =
  "아이폰 사진(HEIC)이면 사진을 화면에 띄우고 스크린샷을 찍어 올려 주세요.";

/** 서버에 보낼 형식. 받을 수 없는 것이면 null. */
export const photoContentType = (file: File): string | null => {
  if (BY_TYPE.has(file.type)) {
    return file.type;
  }
  // 형식을 알려 줬는데 우리가 못 받는 것이면(HEIC 등) 이름을 봐도 소용없다.
  if (file.type) {
    return null;
  }

  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return null;
  return BY_EXTENSION[file.name.slice(dot + 1).toLowerCase()] ?? null;
};
