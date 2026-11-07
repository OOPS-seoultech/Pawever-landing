import { useEffect, useRef, useState } from "react";
import { requestPhotoLinks } from "@/lib/adminApi";

/** Only fetch the first photo when its order card approaches the visible list. */
export function AdminOrderPhotoPreview({
  number,
  petIndex,
  petName,
}: {
  number: string;
  petIndex?: number;
  petName: string;
}) {
  const target = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("사진 대기");
  useEffect(() => {
    let live = true;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        setMessage("사진 로딩 중");
        requestPhotoLinks(number, petIndex)
          .then(value => {
            if (!live) return;
            setUrl(value.photos[0]?.url ?? "");
            setMessage("사진 없음");
          })
          .catch(() => {
            if (live) setMessage("상세에서 재확인");
          });
      },
      { rootMargin: "80px" }
    );
    if (target.current) observer.observe(target.current);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [number, petIndex]);
  return (
    <span
      ref={target}
      className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-center text-[10px] text-muted-foreground"
    >
      {url ? (
        <img
          src={url}
          alt={`${petName} 신청 사진`}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="size-full object-cover"
          onError={() => {
            setUrl("");
            setMessage("상세에서 재확인");
          }}
        />
      ) : (
        message
      )}
    </span>
  );
}
