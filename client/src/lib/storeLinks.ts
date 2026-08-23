/**
 * 앱스토어 주소.
 *
 * 서비스 소개와 앱 서비스 두 화면이 같은 버튼을 쓴다. 각 화면에 따로 적어
 * 두면 주소가 들어올 때 한쪽만 고치게 된다.
 *
 * 아직 주소를 받지 못했다. 비워 두면 화면이 누를 수 없는 상태로 그려진다 —
 * 자리는 피그마대로 두되 아무 데도 가지 않는 링크는 걸지 않는다.
 */
export const STORE_LINKS = [
  { label: "Google Play에서 설치하기", href: "", primary: true },
  { label: "App Store에서 설치하기", href: "", primary: false },
] as const satisfies readonly {
  label: string;
  href: string;
  primary: boolean;
}[];
