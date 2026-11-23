import { StarIcon } from '../components/icons';

/** Three stars, the first `stars` of them gold. Read as "2 of 3 stars" by screen readers. */
export function StarRow({ stars, size = 22, pop = false }: { stars: number; size?: number; pop?: boolean }) {
  return (
    <span className="adv-stars" role="img" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className="adv-star" data-on={n <= stars} data-pop={pop && n <= stars} style={{ animationDelay: pop ? `${(n - 1) * 160}ms` : undefined }}>
          <StarIcon size={size} />
        </span>
      ))}
    </span>
  );
}
