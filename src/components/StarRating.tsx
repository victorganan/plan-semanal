'use client';

export function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n === value ? 0 : n)}
          aria-label={`${n} estrellas`}
          className="text-base leading-none text-priority-medium"
        >
          {value && n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
