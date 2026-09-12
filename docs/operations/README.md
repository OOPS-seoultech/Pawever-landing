# 관리자 운영 시스템 개발 문서

입금 확인부터 모델링·검수 인계까지 구현했다. 사용 화면, 검사 결과와 운영 적용 항목은 백엔드의 [1차 구현 결과](../../../Pawever-back/docs/operations/2026-09-12-first-flow-implementation.md)에 정리했다.

이번 관리자 웹 개발 기준은 백엔드 저장소의 [문서 시작점](../../../Pawever-back/docs/operations/README.md)과 [2026-09-12 개발 보완서](../../../Pawever-back/docs/operations/2026-09-12-development-addendum.md)다. 두 저장소를 같은 상위 폴더에 둔 작업 환경을 기준으로 연결했다. 프론트만 체크아웃한 환경에서는 Pawever-back의 같은 경로를 확인한다.

서버 allowedActions, 행·필드 권한, version과 멱등 요청 계약을 사용한다. 현재 가격·키링·배송 방식·주문별 입금 기한 표시를 보존한다. 수령 장소와 기타 운영 미결정 사항은 보완서 Q1~Q3를 따른다. 문서를 프론트에 복제해 별도 수정하지 않는다.
