import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const policySource = readFileSync(
  new URL("./PrivacyPolicy.tsx", import.meta.url),
  "utf8"
);

describe("개인정보 처리방침", () => {
  it("국외로 데이터를 보내는 분석·광고 도구를 모두 밝힌다", () => {
    // 광고 목적 태그를 켜 두고 고지가 없으면 그 자체가 위험이다.
    // 도구를 빼기 전에는 이 문구도 지우면 안 된다.
    expect(policySource).toContain("Google Analytics 4");
    expect(policySource).toContain("Meta Pixel");
  });

  it("위탁·국외 처리 조항에 실제 이용하는 사업자를 모두 적는다", () => {
    // 인프라가 바뀌면 이 목록도 함께 바뀌어야 한다.
    expect(policySource).toContain("제6조 (처리 위탁 및 국외 처리)");
    expect(policySource).toContain("AWS");
    expect(policySource).toContain("Firebase");
    expect(policySource).toContain("Cloudflare");
  });

  it("앱 접근 권한을 빠짐없이 밝힌다", () => {
    // 권한을 추가하면서 고지를 빼먹으면 스토어 심사에서도 걸린다.
    expect(policySource).toContain("제3조 (앱 접근 권한과 위치 정보)");
    for (const permission of ["카메라", "사진첩", "마이크", "알림", "위치"]) {
      expect(policySource).toContain(permission);
    }
  });

  it("서비스 유형별 보유 기간을 표에 담는다", () => {
    // 앱·웹·제품·선택·자동 다섯 구분은 파기 배치의 기준이기도 하다.
    expect(policySource).toContain("제1조 (수집 정보·이용 목적·보유 기간)");
    for (const retention of [
      "탈퇴 시까지",
      "설문 2년 / 로그 14일",
      "배송 완료 후 90일",
      "2년 또는 철회 / 1년",
      "로그 14일 / GA4 최대 14개월",
    ]) {
      expect(policySource).toContain(retention);
    }
  });

  it("광고성 정보 수신 동의를 서비스 알림과 분리해 밝힌다", () => {
    // 두 동의를 한 줄로 묶으면 정보통신망법상 별도 동의 요건을 못 지킨다.
    expect(policySource).toContain("제7조 (서비스 알림과 광고성 정보)");
    expect(policySource).toContain("광고성 정보");
    expect(policySource).toContain("수신 거부 방법");
  });

  it("조항 번호가 1조부터 빠짐없이 이어진다", () => {
    const numbers = [...policySource.matchAll(/제(\d+)조 \(/g)].map(match =>
      Number(match[1])
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
