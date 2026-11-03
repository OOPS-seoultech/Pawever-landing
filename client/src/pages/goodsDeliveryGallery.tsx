export function GoodsDeliveryGallery() {
  return (
    <figure className="gs-delivery-gallery">
      <div>
        <img
          src="/goods-survey/delivery-packages.webp"
          alt="배송을 위해 분홍색 완충 봉투에 포장한 실제 상품"
          width="606"
          height="650"
          loading="lazy"
          decoding="async"
        />
        <img
          src="/goods-survey/pickup-display.webp"
          alt="현장 수령을 위해 준비한 포장 상품과 완성 피규어"
          width="629"
          height="650"
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>실제 상품 배송 및 수령 이미지</figcaption>
    </figure>
  );
}
