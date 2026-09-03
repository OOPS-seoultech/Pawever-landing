import { describe, expect, it } from "vitest";
import { formatPhoneNumber } from "./goodsSurveyContent";

/**
 * 연락처는 숫자만 받고 하이픈은 화면이 넣는다.
 *
 * "형식에 맞춰 작성해주세요"만 띄우던 때는 하이픈을 넣으라는 건지 빼라는
 * 건지 알 수 없었다. 사람에게 규칙을 지키게 하는 대신 규칙을 없앤다.
 *
 * 이 번호로 입금 안내도 배송 안내도 간다. 틀린 채로 접수되면 연락이 끊긴다.
 */
describe("연락처 서식", () => {
  it("치는 대로 앞에서부터 채운다", () => {
    // 다 치기 전에도 화면이 흔들리지 않아야 한다.
    expect(formatPhoneNumber("0")).toBe("0");
    expect(formatPhoneNumber("010")).toBe("010");
    expect(formatPhoneNumber("0101")).toBe("010-1");
    expect(formatPhoneNumber("0101234")).toBe("010-1234");
  });

  it("열한 자리는 3-4-4 로 끊는다", () => {
    expect(formatPhoneNumber("01012345678")).toBe("010-1234-5678");
  });

  it("열 자리는 3-3-4 로 끊는다", () => {
    // 011·016~019 는 가운데가 세 자리다.
    expect(formatPhoneNumber("0111234567")).toBe("011-123-4567");
  });

  it("사람이 넣은 하이픈·공백은 무시한다", () => {
    // 붙여넣기 한 번에 형식이 깨지지 않아야 한다.
    expect(formatPhoneNumber("010-1234-5678")).toBe("010-1234-5678");
    expect(formatPhoneNumber("010 1234 5678")).toBe("010-1234-5678");
  });

  it("연락처 앱에서 붙여넣은 국제 표기도 받는다", () => {
    // 그대로 두면 821-0123-4567 이라는 없는 번호가 접수된다.
    expect(formatPhoneNumber("+82 10-1234-5678")).toBe("010-1234-5678");
    expect(formatPhoneNumber("+821012345678")).toBe("010-1234-5678");
  });

  it("열한 자리를 넘겨 쳐도 더 받지 않는다", () => {
    // 넘치는 자리를 그대로 받으면 없는 번호가 접수된다.
    expect(formatPhoneNumber("010123456789999")).toBe("010-1234-5678");
  });

  it("지우면 하이픈도 같이 줄어든다", () => {
    // 뒤에서 지울 때 하이픈만 남으면 사람은 그것도 지워야 한다.
    expect(formatPhoneNumber("010-1")).toBe("010-1");
    expect(formatPhoneNumber("010-")).toBe("010");
  });
});
