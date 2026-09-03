import { defineConfig, devices } from "@playwright/test";

/**
 * E2E 는 `pnpm test`(vitest) 와 따로 돈다.
 *
 * 기존 테스트는 전부 .tsx 소스를 문자열로 읽어 대조하는 방식이다. 그래서
 * "링크 주소가 맞다"까지는 보지만 "눌렀더니 거기로 갔다"는 보지 못한다.
 * 이 파일 아래의 테스트가 그 자리를 맡는다.
 *
 * 백엔드는 띄우지 않는다. 캠페인·주문 API 는 각 테스트가 route 로 가로채
 * 응답을 직접 준다. 두 가지 이유다 —
 *   1. goods_open 이 켜진 화면과 꺼진 화면을 둘 다 봐야 하는데, 실제 서버로는
 *      한 번에 한 쪽만 볼 수 있다.
 *   2. 실제 서버에 붙이면 테스트가 돌 때마다 주문 행이 쌓인다. 8/30 에 실제로
 *      대표님 테스트 신청 한 건이 그렇게 남았다.
 */
const PORT = 5273;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      // 랜딩은 모바일 폭 기준으로 그려졌다(피그마 5423:1415, 390px).
      name: "mobile",
      // iPhone 13 서술자는 기본이 WebKit 이다. 브라우저는 Chromium 하나만
      // 받아 두고(설치 용량·CI 시간), 화면 크기와 터치만 가져다 쓴다.
      //
      // isMobile 은 끈다. 이 플래그를 켜면 Chromium 이 시각 뷰포트를 따로
      // 두는데, 그러면 Playwright 가 밖에서 잰 좌표(boundingBox)와 페이지
      // 안에서 하는 히트 테스트(elementFromPoint)가 어긋난다. 실제로 맨 위에
      // 있는 링크를 "가려져 있다"며 누르지 못했다. 이 화면에서 중요한 것은
      // 폭이지 시각 뷰포트가 아니다.
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        isMobile: false,
      },
    },
  ],
  // vite dev 는 요청이 올 때마다 모듈을 변환한다. 테스트 아홉 개가 한꺼번에
  // 붙으면 첫 화면이 30초를 넘겼다. 빌드본을 정적으로 내보내면 그 경합이
  // 없어지고, 덤으로 실제 Cloudflare Pages 에 올라가는 것과 같은 번들을 본다.
  webServer: {
    command: `pnpm build && pnpm vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // 외부 분석 태그를 실제로 받아오면 테스트가 네트워크에 묶인다.
      VITE_ANALYTICS_ENABLED: "false",
      // 디버그를 켜면 보내려던 이벤트가 window.__PAWEVER_ANALYTICS__ 에 쌓인다.
      // 태그를 붙이지 않고도 "무엇이 나갔을 뻔했는지"를 그대로 볼 수 있다.
      // 이 배열은 GA4·GTM 에 실릴 값과 같은 것이다 — 개인정보를 걸러 내는
      // sanitizeAnalyticsProperties 를 지난 뒤에 쌓인다.
      VITE_ANALYTICS_DEBUG: "true",
      VITE_API_BASE_URL: "",
    },
  },
});
