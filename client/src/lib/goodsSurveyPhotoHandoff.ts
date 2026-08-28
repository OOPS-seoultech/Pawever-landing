/**
 * 랜딩에서 고른 사진을 주문 화면으로 넘기는 자리.
 *
 * File 은 직렬화가 되지 않아 URL 로도 sessionStorage 로도 못 넘긴다
 * (goodsSurveyDraftStorage 가 JSON 만 담는 이유와 같다). 그래서 화면을
 * 옮기는 동안만 이 모듈이 들고 있는다. 새로고침하면 사라지고, 그때는
 * 주문 화면에서 다시 고르면 된다.
 *
 * 서버로 미리 올리지 않는 것이 요점이다. 개인정보 동의는 주문 화면에서
 * 받으므로(privacyAgreed) 랜딩에서 올려 두면 동의보다 수집이 앞선다.
 * 디자인이 카드 아래 적어 둔 "사진은 주문 단계에서 최종 제출됩니다"가
 * 그대로 이 동작이다.
 */
let handoff: File[] = [];

export const saveGoodsSurveyPhotoHandoff = (files: File[]) => {
  handoff = files;
};

/**
 * 읽어도 비우지 않는다.
 *
 * 개발 모드의 StrictMode 는 useState 초기화 함수를 두 번 부른다. 읽는
 * 김에 비우면 두 번째 호출이 빈 배열을 받아 고른 사진이 사라진다.
 * 비우는 시점은 주문이 접수된 뒤 한 곳에서만 정한다.
 */
export const loadGoodsSurveyPhotoHandoff = (): File[] => handoff;

export const clearGoodsSurveyPhotoHandoff = () => {
  handoff = [];
};
