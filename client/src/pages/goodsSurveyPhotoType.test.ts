import { describe, expect, it } from "vitest";
import { photoContentType, PHOTO_TYPE_HELP } from "./goodsSurveyPhotoType";

const asFile = (name: string, type: string) =>
  new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type });

describe("올린 사진의 형식을 정한다", () => {
  it("브라우저가 알려 준 형식을 먼저 믿는다", () => {
    expect(photoContentType(asFile("bori.jpg", "image/jpeg"))).toBe("image/jpeg");
    expect(photoContentType(asFile("bori.png", "image/png"))).toBe("image/png");
    expect(photoContentType(asFile("bori.webp", "image/webp"))).toBe("image/webp");
  });

  it("형식을 안 알려 주면 이름 끝을 보고 정한다", () => {
    // 카카오톡 같은 인앱 브라우저와 일부 안드로이드 갤러리는 file.type 을
    // 빈 값으로 준다. 멀쩡한 JPG 인데 형식을 모른다는 이유로 거절하면,
    // 현장에서 카톡 QR 로 들어온 사람이 사진을 한 장도 못 올린다.
    expect(photoContentType(asFile("bori.jpg", ""))).toBe("image/jpeg");
    expect(photoContentType(asFile("bori.JPEG", ""))).toBe("image/jpeg");
    expect(photoContentType(asFile("bori.PNG", ""))).toBe("image/png");
    expect(photoContentType(asFile("bori.webp", ""))).toBe("image/webp");
  });

  it("이름에 점이 여러 개여도 마지막을 본다", () => {
    expect(photoContentType(asFile("우리.보리.2026.jpg", ""))).toBe("image/jpeg");
  });

  it("받을 수 없는 것은 정하지 않는다", () => {
    // 서버가 세 형식만 받고 매직바이트까지 확인한다. 여기서 이름만 보고
    // JPG 라고 우기면 업로드가 끝난 뒤에 거절당한다 - 사진을 다 올리고
    // 기다린 다음에 실패하는 쪽이 더 나쁘다.
    expect(photoContentType(asFile("bori.heic", ""))).toBeNull();
    expect(photoContentType(asFile("bori.heic", "image/heic"))).toBeNull();
    expect(photoContentType(asFile("bori.gif", "image/gif"))).toBeNull();
    expect(photoContentType(asFile("bori", ""))).toBeNull();
  });

  it("아이폰 사진일 때 무엇을 하면 되는지 알려 준다", () => {
    // "JPG·PNG·WEBP 만 됩니다"는 사실이지만 할 일을 알려 주지 않는다.
    // 줄이 선 자리에서 되묻게 만드는 안내는 안내가 아니다.
    expect(PHOTO_TYPE_HELP).toContain("스크린샷");
  });
});
