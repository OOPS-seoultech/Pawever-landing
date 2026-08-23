import { ExternalLink } from "lucide-react";
import { STORE_LINKS } from "@/lib/storeLinks";

/**
 * 앱스토어 설치 버튼 두 개.
 *
 * 서비스 소개와 앱 서비스가 같은 버튼을 쓴다. 화면마다 따로 그려 두면 한쪽만
 * 고치고 끝난다 — 굿즈 버튼 밑줄이 실제로 그렇게 한 화면만 맞았다.
 *
 * 피그마 8. Website / AppServicePage > Container (5243:1495) 기준이다.
 * Google Play 는 주황, App Store 는 검정이고 둘 다 16px Medium 이다.
 */
export default function StoreButtons({
  className = "",
}: {
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {STORE_LINKS.map(store => (
        <li key={store.label}>
          <StoreButton store={store} />
        </li>
      ))}
    </ul>
  );
}

/**
 * 주소를 아직 받지 못했다. 자리를 비우면 피그마와 화면이 달라지고, 빈 링크를
 * 걸면 눌렀을 때 아무 데도 가지 않는다. 주소가 없으면 누를 수 없는 상태로
 * 그려 둔다 — 주소가 들어오면 그대로 링크가 된다.
 */
function StoreButton({ store }: { store: (typeof STORE_LINKS)[number] }) {
  // App Store 는 --foreground(#2C2C2C)가 아니라 순검정이다. 피그마 값 그대로 둔다.
  const skin = store.primary
    ? "bg-primary text-primary-foreground"
    : "border border-border bg-black text-[#FFF9F3]";
  const shape =
    "inline-flex items-center gap-2 rounded-[10px] px-6 py-3 text-base font-medium shadow-[1px_2px_2px_rgba(173,138,105,0.16)]";

  if (!store.href) {
    return (
      <span
        aria-disabled="true"
        className={`${shape} ${skin} cursor-default opacity-60`}
      >
        {store.label}
        <ExternalLink className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <a
      href={store.href}
      target="_blank"
      rel="noreferrer noopener"
      className={`${shape} ${skin} transition-opacity hover:opacity-90`}
    >
      {store.label}
      <ExternalLink className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}
