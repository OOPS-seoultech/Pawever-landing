import { describe, expect, it } from "vitest";
import {
  SELLER_FIELDS,
  TRANSACTION_TERMS,
  sellerNoticeReady,
  type NoticeField,
} from "./sellerNotice";

const labels = (fields: readonly NoticeField[]) => fields.map(f => f.label);

/** 다 채워진 상태를 흉내 낸다. 채워지면 어떻게 되는지도 못 박아야 한다. */
const filled = (fields: readonly NoticeField[]): NoticeField[] =>
  fields.map(f => ({ ...f, value: f.value || "채움" }));

describe("판매자 정보 표시", () => {
  it("전자상거래법 제13조 제1항이 요구하는 항목을 빠짐없이 둔다", () => {
    // 하나라도 빠지면 표시 의무를 지키지 못한다. 목록 자체를 못 박아 둔다.
    expect(labels(SELLER_FIELDS)).toEqual([
      "상호",
      "대표자",
      "사업자등록번호",
      "통신판매업 신고번호",
      "사업장 주소",
      "전화번호",
      "전자우편",
    ]);
  });

  it("정해지지 않은 값을 그럴듯한 말로 채워 두지 않는다", () => {
    // "—" 나 "준비 중"으로 메워 두면 다 채운 것처럼 보인다. 그 화면은
    // 사업자등록번호가 없다는 사실을 공지하는 꼴이 된다.
    const disguised = SELLER_FIELDS.filter(f =>
      ["—", "-", "준비 중", "미정", "추후 공지"].includes(f.value.trim())
    );

    expect(disguised).toEqual([]);
  });
});

describe("거래조건 표시", () => {
  it("대표님이 짚은 취소·반품을 모두 담는다", () => {
    // [카톡 8/24 12:03 단톡, 대표] "2. 구매자가 취소 시 며칠 내 어떻게
    // 진행되는지 / 3. 반품 관련 내용"
    expect(labels(TRANSACTION_TERMS)).toEqual([
      "결제 수단",
      "공급 시기",
      "청약철회 기한·방법",
      "청약철회 제한",
      "교환·반품 조건",
      "대금 환급 방법·기한",
    ]);
  });
});

describe("다 채워지기 전에는 그리지 않는다", () => {
  it("지금은 아직 준비되지 않았다", () => {
    // 사업자등록이 선행이라 상호도 신고번호도 없다. 이 시험이 뒤집히는 날이
    // 표시를 켜는 날이다.
    expect(sellerNoticeReady()).toBe(false);
  });

  it("빈칸이 하나라도 남으면 준비되지 않은 것으로 본다", () => {
    const oneLeft = filled(SELLER_FIELDS);
    oneLeft[0] = { ...oneLeft[0], value: "" };

    expect(sellerNoticeReady(oneLeft, filled(TRANSACTION_TERMS))).toBe(false);
  });

  it("거래조건만 비어도 마찬가지다", () => {
    // 누가 파는지만 적고 취소하면 어떻게 되는지는 안 적는 화면이 나오면
    // 대표님이 짚은 세 가지 중 둘을 빠뜨린 채로 여는 셈이다.
    const oneLeft = filled(TRANSACTION_TERMS);
    oneLeft[2] = { ...oneLeft[2], value: "" };

    expect(sellerNoticeReady(filled(SELLER_FIELDS), oneLeft)).toBe(false);
  });

  it("전부 채우면 준비된 것으로 본다", () => {
    expect(
      sellerNoticeReady(filled(SELLER_FIELDS), filled(TRANSACTION_TERMS))
    ).toBe(true);
  });
});
