// 노션 2번: 랜딩페이지 스크롤 도달 구간을 25/50/75/90으로 나누되,
// 같은 사용자의 같은 구간이 반복 집계되지 않아야 한다.

export const SCROLL_DEPTH_THRESHOLDS = [25, 50, 75, 90] as const;

/**
 * 화면에 보이는 영역의 아래쪽을 기준으로 삼는다.
 * 스크롤을 내리지 않아도 첫 화면만큼은 이미 본 것이기 때문이다.
 */
export const computeScrollPercent = (
  scrollY: number,
  viewportHeight: number,
  documentHeight: number
) => {
  if (documentHeight <= 0) return 0;
  // 문서가 화면보다 짧으면 스크롤 없이 전부 보인다.
  if (documentHeight <= viewportHeight) return 100;
  const seen = scrollY + viewportHeight;
  const percent = (seen / documentHeight) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

/**
 * 방금 넘어선 구간만 돌려주고, 돌려준 구간은 sent에 적어 다시 나오지 않게 한다.
 * 한 번에 여러 구간을 지나쳐도 빠뜨리지 않는다.
 */
export const reachedScrollThresholds = (percent: number, sent: Set<number>) => {
  const crossed: number[] = [];
  for (const threshold of SCROLL_DEPTH_THRESHOLDS) {
    if (percent < threshold || sent.has(threshold)) continue;
    sent.add(threshold);
    crossed.push(threshold);
  }
  return crossed;
};
