/**
 * 앱스토어 주소.
 *
 * 서비스 소개와 앱 서비스 두 화면이 같은 버튼을 쓴다. 각 화면에 따로 적어
 * 두면 주소가 들어올 때 한쪽만 고치게 된다.
 *
 * 애플 주소는 짧은 형태다. 스토어가 주는 주소에는 앱 이름이 퍼센트 인코딩돼
 * 붙어 있는데, 애플은 id 로만 찾으므로 같은 곳으로 간다. 앱 이름이 바뀌어도
 * 이 주소는 그대로 산다.
 */
export type StoreLink = {
  label: string;
  /**
   * 비어 있으면 화면이 누를 수 없는 상태로 그린다 — 자리는 피그마대로 두되
   * 아무 데도 가지 않는 링크는 걸지 않는다.
   *
   * 지금은 둘 다 채워져 있다. 그래도 string 으로 열어 둔다. 리터럴로 좁히면
   * 빈 값 분기가 도달 불가가 되어 타입 검사가 막고, 다음에 주소를 비워야 할
   * 때(스토어 내림 등) 화면 쪽까지 함께 고쳐야 한다.
   */
  href: string;
  primary: boolean;
};

export const STORE_LINKS: readonly StoreLink[] = [
  {
    label: "Google Play에서 설치하기",
    href: "https://play.google.com/store/apps/details?id=com.pawever.mobile",
    primary: true,
  },
  {
    label: "App Store에서 설치하기",
    href: "https://apps.apple.com/kr/app/id6761372939",
    primary: false,
  },
];
