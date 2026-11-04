export function GoodsCustomerReviews() {
  return (
    <div className="gs-customer-reviews">
      {[1, 2, 3, 4].map(number => (
        <img
          key={number}
          src={`/goods-survey/customer-review-${number}.webp`}
          alt={`실제 고객 후기 ${number}: 반려동물과 맞춤 피규어 사진`}
          width="600"
          height="1067"
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}
