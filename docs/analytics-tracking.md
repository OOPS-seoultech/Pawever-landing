# 랜딩·설문 측정 운영 가이드

이벤트 목록, STEP 정의, GA4에서 보고서 만드는 방법은 [analytics-events.md](./analytics-events.md)에 있습니다.
이 문서는 측정 정책과 개인정보 취급 기준을 다룹니다.

## 측정 범위

- UTM과 클릭 ID는 `sessionStorage`에 첫 유입·마지막 유입으로 나누어 저장합니다. 내부 설문으로 이동해 주소의 UTM이 사라져도 같은 `visit_id`로 이어집니다.
- 스크린타임은 운영체제의 전체 사용시간이 아니라, 해당 페이지 탭이 보이고 브라우저 포커스가 있는 동안의 **활성 이용시간**입니다. 랜딩·설문 페이지 활성시간과 문항별 활성시간을 설문 응답 DB에 1차 데이터로 저장하고, 외부 분석 동의 시에만 GA4 이벤트도 전송합니다.
- 기기는 원본 User-Agent를 별도 저장하지 않고 모바일·태블릿·데스크톱 범주, 뷰포트·화면 크기, 픽셀 비율, 언어와 시간대만 기록합니다.

설문 답변값, 이름, 연락처, 주소, 사진·파일명은 GA4 이벤트에 포함하지 않습니다. 설문 응답, 선택 사연, 제작·배송 정보와 사진 메타데이터는 서로 분리해 저장하고 무작위 응답 ID로만 연결합니다.

## 환경변수와 동의

루트의 `.env.example`을 참고합니다. 기본값은 외부 태그 비활성화이며, 다음 세 조건이 충족되어야 네트워크 요청이 발생합니다.

1. `VITE_ANALYTICS_ENABLED=true`
2. GA4 측정 ID 설정
3. 방문자의 외부 방문 분석 동의

GA4는 외부 방문 분석 동의 후 로드됩니다. 동의 전 이벤트는 현재 페이지 메모리에 최대 50개만 대기하고, 거부 시 외부로 전송하지 않습니다. 동의 변경은 `/privacy`에서 할 수 있습니다. Meta Pixel 코드는 향후 광고 집행을 대비해 남겨두되 현재 UI에서는 광고 측정을 허용할 수 없으며, 별도 안내·동의 절차를 마련하기 전에는 활성화하지 않습니다.

Meta CAPI 액세스 토큰은 절대로 `VITE_` 환경변수나 프런트엔드 코드에 넣지 않습니다. 현재 신청 API는 브라우저 Pixel과 서버 전송에서 함께 사용할 `conversionEventId`를 신청 레코드에 저장합니다. CAPI를 활성화할 때는 이 ID를 서버 이벤트의 `event_id`로 사용합니다.

실제 신청 시에는 제출 직전에 `createSubmissionTrackingContext()`를 한 번 호출해 그 결과의 `conversionEventId`를 신청 API와 함께 전송합니다. 서버 저장이 성공한 뒤에만 같은 ID로 `application_complete`를 호출하므로 새로고침이나 중복 클릭을 실제 전환으로 세지 않습니다.

## 이벤트 기준

전체 목록과 파라미터는 [analytics-events.md](./analytics-events.md)를 따릅니다. 여기서는 전송 대상과 개인정보 기준만 정리합니다.

- Meta로도 보내는 이벤트는 `landing_view`(`PageView`), `survey_cta_click`, `survey_start`, `survey_complete`, `application_complete`(`Lead`) 다섯 개뿐입니다. 나머지는 GA4에만 전송합니다.
- `survey_question_view`, `survey_question_answered`는 문항 ID·유형·활성시간·건너뛰기 여부만 보내고 **답변값은 제외**합니다.
- `survey_complete`와 `application_complete`는 서버 저장이 성공한 뒤에만 호출합니다.
- GTM 컨테이너는 서드파티 태그의 통로일 뿐이며, GA4 태그를 GTM 안에서 다시 만들면 이중 집계됩니다.

## 로컬 검증

개발 환경에서는 외부 ID가 없어도 발생 이벤트가 브라우저 콘솔과 `window.__PAWEVER_ANALYTICS__`에 기록됩니다.

```text
http://localhost:3000/goods-survey?utm_source=meta&utm_medium=paid_social&utm_campaign=goods_test&utm_content=video_a
```

확인 순서는 다음과 같습니다.

1. Spring Boot API를 `localhost:8080`, Vite를 `localhost:3000`에서 실행한 뒤 위 주소로 진입합니다.
2. 개발자 도구 콘솔에서 `window.__PAWEVER_ANALYTICS__`를 확인합니다.
3. 이벤트의 `visitId`가 유지되고 `attribution.firstTouch`에 UTM이 남는지 확인합니다.
4. 다른 탭으로 이동한 시간은 `active_ms`에 더해지지 않는지 확인합니다.

운영 전에는 GA4 DebugView에서 이벤트를 검증하고, 개인정보 처리방침의 분석 도구·국외 이전·보유기간 문구를 실제 운영 설정과 계약 주체에 맞게 법률 검토해야 합니다. Meta Pixel을 도입할 때는 별도의 광고 측정 안내·동의 UI를 먼저 구현한 뒤 Meta Test Events에서도 검증합니다.
